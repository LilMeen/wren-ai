#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
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


def _rewrite_redirect_url(location: str, host: str, http_port: int, be_http_port: int) -> str:
    """Replace Docker-internal hostname in redirect URL with the configured host."""
    parsed = urllib.parse.urlparse(location)
    if parsed.hostname and parsed.hostname != host:
        port = parsed.port or be_http_port
        return urllib.parse.urlunparse(parsed._replace(netloc=f"{host}:{port}"))
    return location


def _make_no_redirect_opener() -> urllib.request.OpenerDirector:
    """Build a urllib opener that does NOT follow redirects.

    urllib's default opener follows 307/308 redirects automatically, which causes
    a hang on Windows when StarRocks FE redirects to a Docker-internal BE hostname
    (e.g. starrocks-be:8040) that is not resolvable from the host.
    Without HTTPRedirectHandler, 307/308 responses go through HTTPErrorProcessor
    which raises HTTPError — letting the caller rewrite the URL and retry.
    """
    opener = urllib.request.OpenerDirector()
    for cls in [
        urllib.request.UnknownHandler,
        urllib.request.HTTPHandler,
        urllib.request.HTTPDefaultErrorHandler,
        urllib.request.HTTPErrorProcessor,
    ]:
        opener.add_handler(cls())
    return opener


_NO_REDIRECT_OPENER = _make_no_redirect_opener()


def stream_load(env: dict[str, str], database: str, table: str, csv_path: Path) -> None:
    host = require(env, "STARROCKS_HOST")
    http_port = int(env.get("STARROCKS_HTTP_PORT", "8030"))
    be_http_port = int(env.get("STARROCKS_BE_HTTP_PORT", "8040"))
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
    print(f"LOAD {database}.{table} <- {csv_path} ({csv_path.stat().st_size} bytes)")
    timeout = int(env.get("STARROCKS_HTTP_TIMEOUT", "300"))
    # Prefer curl: it handles Expect:100-continue + redirects reliably across environments.
    # Fall back to urllib only when curl is not installed.
    if shutil.which("curl"):
        body = stream_load_with_curl(env, url, host, be_http_port, user, password, headers, csv_path, database, table, None)
    else:
        data = csv_path.read_bytes()
        req = urllib.request.Request(url, data=data, headers=headers, method="PUT")
        try:
            with _NO_REDIRECT_OPENER.open(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as err:
            if err.code in (307, 308) and err.headers.get("Location"):
                redirect_url = _rewrite_redirect_url(err.headers["Location"], host, http_port, be_http_port)
                req2 = urllib.request.Request(redirect_url, data=data, headers=headers, method="PUT")
                with _NO_REDIRECT_OPENER.open(req2, timeout=timeout) as resp:
                    body = resp.read().decode("utf-8", errors="replace")
            else:
                detail = err.read().decode("utf-8", errors="replace")
                raise SystemExit(f"Stream load failed for {database}.{table}: HTTP {err.code}\n{detail}") from err
        except (urllib.error.URLError, OSError) as err:
            raise SystemExit(f"Stream load failed for {database}.{table}: {err}\nInstall curl for better compatibility.") from err
    result = json.loads(body)
    status = result.get("Status")
    if status not in ("Success", "Publish Timeout"):
        raise SystemExit(f"Stream load failed for {database}.{table}: {body}")
    print(f"LOAD {database}.{table}: {status}, rows={result.get('NumberTotalRows')}, label={label}")


def stream_load_with_curl(
    env: dict[str, str],
    url: str,
    host: str,
    be_http_port: int,
    user: str,
    password: str,
    headers: dict[str, str],
    csv_path: Path,
    database: str,
    table: str,
    original_error: Exception | None,
) -> str:
    curl = shutil.which("curl")
    if not curl:
        msg = f"Stream load failed for {database}.{table}: curl not found"
        if original_error:
            msg += f" (urllib also failed: {original_error})"
        raise SystemExit(msg) from original_error
    cmd = [
        curl,
        "--fail-with-body",
        "--location-trusted",
        "--silent",
        "--show-error",
        "--max-time",
        env.get("STARROCKS_HTTP_TIMEOUT", "300"),
    ]
    # When connecting from a Windows host (localhost/127.0.0.1), Docker-internal BE
    # hostnames are not resolvable — map them to localhost so curl can follow redirects.
    # Inside Docker the hostname already resolves via Docker DNS, so skip --resolve.
    if host in ("localhost", "127.0.0.1"):
        cmd.extend(["--resolve", f"starrocks-be:{be_http_port}:127.0.0.1"])
    cmd.extend([
        "-u",
        f"{user}:{password}",
        "-T",
        str(csv_path),
        "-X",
        "PUT",
    ])
    for key, value in headers.items():
        if key == "Authorization":
            continue
        cmd.extend(["-H", f"{key}: {value}"])
    cmd.append(url)
    print(f"Retry with curl after urllib error: {original_error}")
    proc = subprocess.run(cmd, text=True, capture_output=True)
    if proc.returncode != 0:
        detail = (proc.stdout + "\n" + proc.stderr).strip()
        raise SystemExit(
            f"Stream load failed for {database}.{table}: curl exit {proc.returncode}\n{detail}"
        ) from original_error
    return proc.stdout

def refresh_materialized_views(env: dict[str, str]) -> None:
    """Synchronously refresh all async materialized views after data load."""
    objects = schema_objects()
    mvs = [obj for obj in objects.values() if obj["kind"] == "materialized_view"]
    if not mvs:
        return
    print(f"Refreshing {len(mvs)} materialized view(s)...")
    with connect_mysql(env) as conn:
        with conn.cursor() as cur:
            for obj in mvs:
                stmt = f"REFRESH MATERIALIZED VIEW `{obj['database']}`.`{obj['table']}`"
                print(f"  {stmt}")
                cur.execute(stmt)
    print("Materialized view refresh complete.")


def import_csv(env: dict[str, str], only_tables: set[str] | None = None, skip_truncate: bool = False) -> None:
    objects = schema_objects()
    truncate = (not skip_truncate) and env.get("STARROCKS_TRUNCATE_BEFORE_LOAD", "true").lower() == "true"
    loadable = [obj for obj in objects.values() if obj["kind"] == "table"]
    skipped = [obj for obj in objects.values() if obj["kind"] != "table"]
    if skipped:
        print("Skip non-loadable objects:", ", ".join(f"{x['database']}.{x['table']}({x['kind']})" for x in skipped))
    if only_tables:
        print(f"Filter: only loading {len(only_tables)} table(s): {', '.join(sorted(only_tables))}\n")
    if truncate:
        with connect_mysql(env) as conn:
            with conn.cursor() as cur:
                for obj in loadable:
                    if only_tables and obj["table"] not in only_tables:
                        continue
                    csv_path = DATA_DIR / f"{obj['table']}.csv"
                    if csv_path.exists():
                        print(f"TRUNCATE {obj['database']}.{obj['table']}")
                        cur.execute(f"TRUNCATE TABLE `{obj['database']}`.`{obj['table']}`")
    for obj in loadable:
        if only_tables and obj["table"] not in only_tables:
            continue
        csv_path = DATA_DIR / f"{obj['table']}.csv"
        if not csv_path.exists():
            print(f"Skip missing CSV: {csv_path}")
            continue
        stream_load(env, obj["database"], obj["table"], csv_path)
    refresh_materialized_views(env)


def main() -> None:
    parser = argparse.ArgumentParser(description="Init StarRocks schema and load CSV data.")
    parser.add_argument("--env", default=str(ENV_PATH), help="Path to .env file")
    parser.add_argument("--skip-schema", action="store_true", help="Do not execute create schema SQL")
    parser.add_argument("--skip-load", action="store_true", help="Do not import CSV data")
    parser.add_argument("--skip-truncate", action="store_true",
                        help="Skip TRUNCATE before load (useful when resuming a failed run)")
    parser.add_argument("--tables", nargs="+", metavar="TABLE",
                        help="Only load these table(s) by name, e.g. --tables stg_vehicle_histories dim_device")
    args = parser.parse_args()
    env = load_env(Path(args.env))
    if not args.skip_schema:
        run_schema_sql(env)
    if not args.skip_load:
        only = set(args.tables) if args.tables else None
        import_csv(env, only_tables=only, skip_truncate=args.skip_truncate)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
