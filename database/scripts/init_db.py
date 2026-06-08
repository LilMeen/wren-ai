#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
SQL_PATH = ROOT / "sql" / "create_starrocks_schema.sql"
SCHEMA_PATH = ROOT / "docs" / "starrock_schema.json"
DATA_DIR = ROOT / "data"


def load_env(path: Path) -> dict[str, str]:
    env = dict(os.environ)
    if not path.exists():
        return env
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def require(env: dict[str, str], key: str) -> str:
    value = env.get(key, "")
    if value == "":
        raise SystemExit(f"Missing required env: {key} in {ENV_PATH}")
    return value


def split_sql(sql: str) -> list[str]:
    statements: list[str] = []
    buf: list[str] = []
    in_single = in_double = in_backtick = False
    i = 0
    while i < len(sql):
        ch = sql[i]
        nxt = sql[i + 1] if i + 1 < len(sql) else ""
        if not (in_single or in_double or in_backtick) and ch == "-" and nxt == "-":
            while i < len(sql) and sql[i] != "\n":
                i += 1
            continue
        if ch == "`" and not (in_single or in_double):
            in_backtick = not in_backtick
        elif ch == "'" and not (in_double or in_backtick):
            in_single = not in_single
        elif ch == '"' and not (in_single or in_backtick):
            in_double = not in_double
        if ch == ";" and not (in_single or in_double or in_backtick):
            stmt = "".join(buf).strip()
            if stmt:
                statements.append(stmt)
            buf = []
        else:
            buf.append(ch)
        i += 1
    stmt = "".join(buf).strip()
    if stmt:
        statements.append(stmt)
    return statements


def connect_mysql(env: dict[str, str]):
    try:
        import pymysql
    except ImportError as exc:
        raise SystemExit("Missing dependency: pip install pymysql") from exc
    return pymysql.connect(
        host=require(env, "STARROCKS_HOST"),
        port=int(env.get("STARROCKS_QUERY_PORT", "9030")),
        user=require(env, "STARROCKS_USER"),
        password=env.get("STARROCKS_PASSWORD", ""),
        charset="utf8mb4",
        autocommit=True,
    )


def run_schema_sql(env: dict[str, str]) -> None:
    sql = SQL_PATH.read_text(encoding="utf-8")
    statements = split_sql(sql)
    with connect_mysql(env) as conn:
        with conn.cursor() as cur:
            for idx, stmt in enumerate(statements, start=1):
                print(f"[{idx}/{len(statements)}] SQL: {stmt.splitlines()[0][:100]}")
                cur.execute(stmt)


def schema_objects() -> dict[str, dict[str, str]]:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    out: dict[str, dict[str, str]] = {}
    for full_name, meta in schema.items():
        catalog, database, table = full_name.split(".")[-3:]
        first_line = meta["ddl"].lstrip().split("\n", 1)[0].upper()
        if first_line.startswith("CREATE MATERIALIZED VIEW"):
            kind = "materialized_view"
        elif first_line.startswith("CREATE EXTERNAL TABLE"):
            kind = "table"
        elif first_line.startswith("CREATE TABLE"):
            kind = "table"
        else:
            kind = "unknown"
        out[table] = {"catalog": catalog, "database": database, "table": table, "kind": kind}
    return out


def stream_load(env: dict[str, str], database: str, table: str, csv_path: Path) -> None:
    host = require(env, "STARROCKS_HOST")
    http_port = int(env.get("STARROCKS_HTTP_PORT", "8030"))
    scheme = env.get("STARROCKS_HTTP_SCHEME", "http")
    user = require(env, "STARROCKS_USER")
    password = env.get("STARROCKS_PASSWORD", "")
    label_prefix = env.get("STARROCKS_LOAD_LABEL_PREFIX", "wren_fake_data")
    label = f"{label_prefix}_{database}_{table}_{int(time.time() * 1000)}"
    url = f"{scheme}://{host}:{http_port}/api/{database}/{table}/_stream_load"
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    headers = {
        "Authorization": f"Basic {token}",
        "label": label,
        "format": "csv",
        "column_separator": env.get("STARROCKS_COLUMN_SEPARATOR", ","),
        "skip_header": "1",
        "strict_mode": env.get("STARROCKS_STRICT_MODE", "false"),
        "max_filter_ratio": env.get("STARROCKS_MAX_FILTER_RATIO", "0.1"),
        "trim_space": "true",
        "enclose": '"',
        "escape": "\\",
        "Expect": "100-continue",
    }
    data = csv_path.read_bytes()
    req = urllib.request.Request(url, data=data, headers=headers, method="PUT")
    try:
        with urllib.request.urlopen(req, timeout=int(env.get("STARROCKS_HTTP_TIMEOUT", "300"))) as resp:
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as err:
        if err.code in (307, 308) and err.headers.get("Location"):
            req = urllib.request.Request(err.headers["Location"], data=data, headers=headers, method="PUT")
            with urllib.request.urlopen(req, timeout=int(env.get("STARROCKS_HTTP_TIMEOUT", "300"))) as resp:
                body = resp.read().decode("utf-8", errors="replace")
        else:
            detail = err.read().decode("utf-8", errors="replace")
            raise SystemExit(f"Stream load failed for {database}.{table}: HTTP {err.code}\n{detail}") from err
    result = json.loads(body)
    status = result.get("Status")
    if status not in ("Success", "Publish Timeout"):
        raise SystemExit(f"Stream load failed for {database}.{table}: {body}")
    print(f"LOAD {database}.{table}: {status}, rows={result.get('NumberTotalRows')}, label={label}")


def import_csv(env: dict[str, str]) -> None:
    objects = schema_objects()
    truncate = env.get("STARROCKS_TRUNCATE_BEFORE_LOAD", "true").lower() == "true"
    loadable = [obj for obj in objects.values() if obj["kind"] == "table"]
    skipped = [obj for obj in objects.values() if obj["kind"] != "table"]
    if skipped:
        print("Skip non-loadable objects:", ", ".join(f"{x['database']}.{x['table']}({x['kind']})" for x in skipped))
    if truncate:
        with connect_mysql(env) as conn:
            with conn.cursor() as cur:
                for obj in loadable:
                    csv_path = DATA_DIR / f"{obj['table']}.csv"
                    if csv_path.exists():
                        print(f"TRUNCATE {obj['database']}.{obj['table']}")
                        cur.execute(f"TRUNCATE TABLE `{obj['database']}`.`{obj['table']}`")
    for obj in loadable:
        csv_path = DATA_DIR / f"{obj['table']}.csv"
        if not csv_path.exists():
            print(f"Skip missing CSV: {csv_path}")
            continue
        stream_load(env, obj["database"], obj["table"], csv_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Init StarRocks schema and load CSV data.")
    parser.add_argument("--env", default=str(ENV_PATH), help="Path to .env file")
    parser.add_argument("--skip-schema", action="store_true", help="Do not execute create schema SQL")
    parser.add_argument("--skip-load", action="store_true", help="Do not import CSV data")
    args = parser.parse_args()
    env = load_env(Path(args.env))
    if not args.skip_schema:
        run_schema_sql(env)
    if not args.skip_load:
        import_csv(env)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
