"""
add_sql_pair.py — Sync SQL pairs từ database/sql_pairs/*.yml vào Wren AI via GraphQL.

Matching strategy:
  - Dùng local cache (sql_pair_ids.json) để map id → Wren DB id
  - Lần đầu: tạo mới, lưu mapping vào cache
  - Lần sau: nếu question hoặc sql thay đổi → update (cần --replace)
  - --delete-unknown: xóa SQL pairs trong Wren không có trong YAML

Usage:
    py -3.10 database/scripts/add_sql_pair.py
    py -3.10 database/scripts/add_sql_pair.py --dry-run
    py -3.10 database/scripts/add_sql_pair.py --replace
    py -3.10 database/scripts/add_sql_pair.py --domain parking
    py -3.10 database/scripts/add_sql_pair.py --delete-unknown
    py -3.10 database/scripts/add_sql_pair.py --clear-cache
    py -3.10 database/scripts/add_sql_pair.py --endpoint http://localhost:3000/api/graphql
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
SQL_PAIRS_DIR = ROOT / "database" / "sql_pairs"
CACHE_PATH = ROOT / "database" / "scripts" / "sql_pair_ids.json"

DEFAULT_ENDPOINT = "http://74.48.140.178:27668/api/graphql"

DOMAIN_FILES = {
    "parking":   "sql_pairs_parking.yml",
    "device":    "sql_pairs_device.yml",
    "asset":     "sql_pairs_asset.yml",
    "dmp":       "sql_pairs_dmp.yml",
    "telemetry": "sql_pairs_telemetry.yml",
}

# ── GraphQL documents ──────────────────────────────────────────────────────────

LIST_SQL_PAIRS_QUERY = """
query SqlPairs {
  sqlPairs {
    id
    question
    sql
  }
}
"""

CREATE_SQL_PAIR_MUTATION = """
mutation CreateSqlPair($data: CreateSqlPairInput!) {
  createSqlPair(data: $data) {
    id
    question
    sql
  }
}
"""

UPDATE_SQL_PAIR_MUTATION = """
mutation UpdateSqlPair($where: SqlPairWhereUniqueInput!, $data: UpdateSqlPairInput!) {
  updateSqlPair(where: $where, data: $data) {
    id
    question
    sql
  }
}
"""

DELETE_SQL_PAIR_MUTATION = """
mutation DeleteSqlPair($where: SqlPairWhereUniqueInput!) {
  deleteSqlPair(where: $where)
}
"""


# ── Helpers ────────────────────────────────────────────────────────────────────

def graphql_request(
    endpoint: str,
    query: str,
    variables: dict[str, Any] | None = None,
    timeout: int = 30,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"query": query}
    if variables is not None:
        payload["variables"] = variables

    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Cannot reach {endpoint}: {exc}") from exc

    result = json.loads(body)
    if result.get("errors"):
        raise RuntimeError(json.dumps(result["errors"], ensure_ascii=False, indent=2))
    return result


def load_yaml_sql_pairs(paths: list[Path]) -> list[dict[str, Any]]:
    try:
        import yaml  # type: ignore[import]
    except ImportError:
        raise SystemExit("pyyaml is required: pip install pyyaml")

    out = []
    for path in paths:
        if not path.exists():
            print(f"  ⚠  File not found: {path}")
            continue
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        items = raw.get("sql_pairs", []) or []
        for item in items:
            if not item.get("question") or not item.get("sql"):
                continue
            out.append({
                "id": item.get("id", ""),
                "question": str(item["question"]).strip(),
                "sql": " ".join(str(item["sql"]).split()),  # normalize whitespace
            })
    return out


def load_cache(path: Path) -> dict[str, int]:
    """Load yaml_id → Wren DB id mapping."""
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_cache(path: Path, cache: dict[str, int]) -> None:
    path.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")


def _normalize(text: str) -> str:
    return " ".join(text.split())


def _pair_changed(existing: dict[str, Any], item: dict[str, Any]) -> list[str]:
    changes = []
    if _normalize(existing["question"]) != _normalize(item["question"]):
        changes.append("question")
    if _normalize(existing["sql"]) != _normalize(item["sql"]):
        changes.append("sql")
    return changes


def resolve_paths(domain: str | None) -> list[Path]:
    if domain:
        if domain not in DOMAIN_FILES:
            raise SystemExit(
                f"Unknown domain '{domain}'. Valid: {', '.join(DOMAIN_FILES)}"
            )
        return [SQL_PAIRS_DIR / DOMAIN_FILES[domain]]
    return [SQL_PAIRS_DIR / fname for fname in DOMAIN_FILES.values()]


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync sql_pairs YAML files into Wren AI via GraphQL."
    )
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT)
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would change, no writes.")
    parser.add_argument("--replace", action="store_true",
                        help="Update pairs whose question or SQL has changed.")
    parser.add_argument("--delete-unknown", action="store_true",
                        help="Delete pairs in Wren not present in any YAML file.")
    parser.add_argument("--domain", choices=list(DOMAIN_FILES),
                        help="Sync only one domain (default: all).")
    parser.add_argument("--clear-cache", action="store_true",
                        help="Reset local ID cache before running.")
    args = parser.parse_args()

    print(f"Endpoint : {args.endpoint}")
    print(f"Domain   : {args.domain or 'all'}")
    print(f"Cache    : {CACHE_PATH}")
    print()

    if args.clear_cache and CACHE_PATH.exists():
        CACHE_PATH.unlink()
        print("Cache cleared.\n")

    # Load YAML pairs
    paths = resolve_paths(args.domain)
    yaml_pairs = load_yaml_sql_pairs(paths)
    print(f"SQL pairs in YAML : {len(yaml_pairs)}")

    # Load cache
    cache: dict[str, int] = load_cache(CACHE_PATH)

    # Fetch from Wren
    existing_raw: list[dict[str, Any]] = graphql_request(
        args.endpoint, LIST_SQL_PAIRS_QUERY
    )["data"]["sqlPairs"]
    print(f"SQL pairs in Wren : {len(existing_raw)}")
    print(f"Cached id->DB id  : {len(cache)}")
    print()

    existing_by_db_id: dict[int, dict[str, Any]] = {r["id"]: r for r in existing_raw}
    existing_by_question: dict[str, dict[str, Any]] = {
        _normalize(r["question"]): r for r in existing_raw
    }

    to_create: list[dict[str, Any]] = []
    to_update: list[tuple[int, dict[str, Any], list[str]]] = []
    skipped: list[str] = []

    for item in yaml_pairs:
        yaml_id = item["id"]
        db_id: int | None = cache.get(yaml_id)
        existing: dict[str, Any] | None = None

        # Look up by cached DB id
        if db_id is not None:
            existing = existing_by_db_id.get(db_id)
            if existing is None:
                print(f"  ⚠  Cache stale [{yaml_id}] id={db_id} not in Wren — will recreate")
                del cache[yaml_id]
                db_id = None

        # Fallback: match by question text
        if existing is None:
            existing = existing_by_question.get(_normalize(item["question"]))
            if existing is not None:
                cache[yaml_id] = existing["id"]

        if existing is None:
            to_create.append(item)
        else:
            changed = _pair_changed(existing, item)
            if changed:
                if args.replace:
                    to_update.append((existing["id"], item, changed))
                else:
                    skipped.append(f"{yaml_id} (changed: {', '.join(changed)} — use --replace)")
            else:
                skipped.append(f"{yaml_id} (up-to-date)")

    # Unknown: in Wren but not tracked in cache and question not in YAML
    yaml_questions = {_normalize(p["question"]) for p in yaml_pairs}
    cached_db_ids = set(cache.values())
    to_delete: list[dict[str, Any]] = [
        r for r in existing_raw
        if _normalize(r["question"]) not in yaml_questions and r["id"] not in cached_db_ids
    ]

    # ── Summary ────────────────────────────────────────────────────────────────
    print(f"To create : {len(to_create)}")
    print(f"To update : {len(to_update)}")
    print(f"Skipped   : {len(skipped)}")
    print(f"Unknown   : {len(to_delete)}"
          + (" (will delete)" if args.delete_unknown else " (use --delete-unknown to remove)"))
    print()

    if to_create:
        print("--- Will CREATE ---")
        for item in to_create:
            print(f"  [{item['id']}] {item['question']}")
        print()

    if to_update:
        print("--- Will UPDATE ---")
        for db_id, item, changed in to_update:
            print(f"  db_id={db_id} [{item['id']}] changed: {', '.join(changed)}")
        print()

    if skipped:
        print("--- Skipped ---")
        for s in skipped:
            print(f"  {s}")
        print()

    if to_delete:
        print("--- Unknown (in Wren, not in YAML) ---")
        for rec in to_delete:
            print(f"  db_id={rec['id']} Q: {rec['question'][:80]}")
        print()

    if args.dry_run:
        print("Dry run — nothing written.")
        return 0

    # ── Create ─────────────────────────────────────────────────────────────────
    created = 0
    failed: list[tuple[str, str]] = []
    for item in to_create:
        try:
            result = graphql_request(
                args.endpoint,
                CREATE_SQL_PAIR_MUTATION,
                {"data": {"question": item["question"], "sql": item["sql"]}},
            )
            new_id = result["data"]["createSqlPair"]["id"]
            cache[item["id"]] = new_id
            print(f"  Created  db_id={new_id}  [{item['id']}]")
            created += 1
        except RuntimeError as exc:
            msg = str(exc)
            print(f"  FAILED   [{item['id']}]: {msg[:120]}")
            failed.append((item["id"], msg))

    # ── Update ─────────────────────────────────────────────────────────────────
    updated = 0
    for db_id, item, changed in to_update:
        try:
            graphql_request(
                args.endpoint,
                UPDATE_SQL_PAIR_MUTATION,
                {
                    "where": {"id": db_id},
                    "data": {"question": item["question"], "sql": item["sql"]},
                },
            )
            print(f"  Updated  db_id={db_id}  [{item['id']}]  ({', '.join(changed)})")
            updated += 1
        except RuntimeError as exc:
            print(f"  FAILED   [{item['id']}] update: {str(exc)[:120]}")
            failed.append((item["id"], str(exc)))

    # ── Delete ─────────────────────────────────────────────────────────────────
    deleted = 0
    if args.delete_unknown:
        for rec in to_delete:
            graphql_request(
                args.endpoint,
                DELETE_SQL_PAIR_MUTATION,
                {"where": {"id": rec["id"]}},
            )
            print(f"  Deleted  db_id={rec['id']}  {rec['question'][:60]}")
            deleted += 1

    save_cache(CACHE_PATH, cache)
    print(f"\nCache saved -> {CACHE_PATH}")
    if failed:
        print(f"\nFailed pairs ({len(failed)}) — model likely missing from Wren:")
        for fid, _ in failed:
            print(f"  [{fid}]")
    print(f"\nDone — created {created}, updated {updated}, deleted {deleted}, skipped {len(skipped)}, failed {len(failed)}.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
