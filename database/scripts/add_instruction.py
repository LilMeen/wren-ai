"""
add_instruction.py — Sync instructions from database/instructions.yml into Wren AI via GraphQL.

Matching strategy:
  - First run  : creates all instructions, saves name → Wren ID into instruction_ids.json
  - Later runs : looks up by name in cache → updates only changed fields (text, questions, isDefault)
  - Fallback   : if name not in cache, tries text match; if still not found, creates new

Usage:
    py -3.10 database/scripts/add_instruction.py
    py -3.10 database/scripts/add_instruction.py --dry-run
    py -3.10 database/scripts/add_instruction.py --replace          # update changed instructions
    py -3.10 database/scripts/add_instruction.py --delete-unknown   # remove Wren instructions not in YAML
    py -3.10 database/scripts/add_instruction.py --clear-cache      # reset local ID cache
    py -3.10 database/scripts/add_instruction.py --endpoint http://localhost:3000/api/graphql
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
INSTRUCTIONS_PATH = ROOT / "database" / "instructions.yml"
CACHE_PATH = ROOT / "database" / "scripts" / "instruction_ids.json"

DEFAULT_ENDPOINT = "http://74.48.140.178:27668/api/graphql"

# ── GraphQL documents ──────────────────────────────────────────────────────────

LIST_INSTRUCTIONS_QUERY = """
query Instructions {
  instructions {
    id
    instruction
    questions
    isDefault
  }
}
"""

CREATE_INSTRUCTION_MUTATION = """
mutation CreateInstruction($data: CreateInstructionInput!) {
  createInstruction(data: $data) {
    id
    instruction
  }
}
"""

UPDATE_INSTRUCTION_MUTATION = """
mutation UpdateInstruction($where: InstructionWhereInput!, $data: UpdateInstructionInput!) {
  updateInstruction(where: $where, data: $data) {
    id
    instruction
  }
}
"""

DELETE_INSTRUCTION_MUTATION = """
mutation DeleteInstruction($where: InstructionWhereInput!) {
  deleteInstruction(where: $where)
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


def load_yaml_instructions(path: Path) -> list[dict[str, Any]]:
    try:
        import yaml  # type: ignore[import]
    except ImportError:
        raise SystemExit("pyyaml is required: pip install pyyaml")

    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    items = raw.get("instructions", []) or []
    out = []
    for item in items:
        if not item.get("instruction"):
            continue
        out.append({
            "name": item.get("name", ""),
            "instruction": str(item["instruction"]).strip(),
            "questions": [str(q) for q in (item.get("questions") or [])],
            "isDefault": bool(item.get("isDefault", False)),
        })
    return out


def load_cache(path: Path) -> dict[str, int]:
    """Load name → Wren ID mapping from local cache file."""
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_cache(path: Path, cache: dict[str, int]) -> None:
    path.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")


def _normalize(text: str) -> str:
    """Collapse whitespace for loose comparison."""
    return " ".join(text.split())


def _instruction_changed(existing: dict[str, Any], item: dict[str, Any]) -> list[str]:
    """Return list of field names that differ between Wren record and YAML item."""
    changes = []
    if _normalize(existing["instruction"]) != _normalize(item["instruction"]):
        changes.append("instruction")
    if set(existing.get("questions") or []) != set(item["questions"]):
        changes.append("questions")
    if existing.get("isDefault") != item["isDefault"]:
        changes.append("isDefault")
    return changes


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync instructions.yml into Wren AI via GraphQL."
    )
    parser.add_argument(
        "--endpoint",
        default=DEFAULT_ENDPOINT,
        help=f"GraphQL endpoint (default: {DEFAULT_ENDPOINT})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without writing anything.",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Update instructions whose content has changed (default: skip changed).",
    )
    parser.add_argument(
        "--delete-unknown",
        action="store_true",
        help="Delete instructions in Wren that are not in instructions.yml.",
    )
    parser.add_argument(
        "--clear-cache",
        action="store_true",
        help="Reset local ID cache before running (forces re-match by text).",
    )
    args = parser.parse_args()

    print(f"Endpoint : {args.endpoint}")
    print(f"Source   : {INSTRUCTIONS_PATH}")
    print(f"Cache    : {CACHE_PATH}")
    print()

    if args.clear_cache and CACHE_PATH.exists():
        CACHE_PATH.unlink()
        print("Cache cleared.\n")

    # Load source YAML
    yaml_instructions = load_yaml_instructions(INSTRUCTIONS_PATH)
    print(f"Instructions in YAML : {len(yaml_instructions)}")

    # Load local name → ID cache
    cache: dict[str, int] = load_cache(CACHE_PATH)

    # Fetch existing instructions from Wren
    existing_raw: list[dict[str, Any]] = graphql_request(
        args.endpoint, LIST_INSTRUCTIONS_QUERY
    )["data"]["instructions"]
    print(f"Instructions in Wren : {len(existing_raw)}")
    print(f"Cached name->ID pairs: {len(cache)}")
    print()

    # Build fallback lookup by normalized text
    existing_by_text: dict[str, dict[str, Any]] = {
        _normalize(r["instruction"]): r for r in existing_raw
    }
    existing_by_id: dict[int, dict[str, Any]] = {r["id"]: r for r in existing_raw}

    to_create: list[dict[str, Any]] = []
    to_update: list[tuple[int, dict[str, Any], list[str]]] = []  # (id, item, changed_fields)
    skipped: list[str] = []

    for item in yaml_instructions:
        name = item["name"]
        wren_id: int | None = cache.get(name)

        # Try to find existing record
        existing: dict[str, Any] | None = None
        if wren_id is not None:
            existing = existing_by_id.get(wren_id)
            if existing is None:
                # ID in cache but not in Wren — stale cache entry
                print(f"  ⚠  Cache stale for [{name}] (id={wren_id} not found in Wren) — will recreate")
                del cache[name]
                wren_id = None

        if existing is None:
            # Fallback: match by normalized text
            existing = existing_by_text.get(_normalize(item["instruction"]))
            if existing is not None:
                # Found by text — warm up cache
                cache[name] = existing["id"]

        if existing is None:
            to_create.append(item)
        else:
            changed_fields = _instruction_changed(existing, item)
            if changed_fields:
                if args.replace:
                    to_update.append((existing["id"], item, changed_fields))
                else:
                    skipped.append(f"{name} (changed: {', '.join(changed_fields)} — use --replace)")
            else:
                skipped.append(f"{name} (up-to-date)")

    # Unknown: in Wren but name not tracked in cache and text not in YAML
    yaml_norms = {_normalize(i["instruction"]) for i in yaml_instructions}
    cached_ids = set(cache.values())
    to_delete: list[dict[str, Any]] = [
        r for r in existing_raw
        if _normalize(r["instruction"]) not in yaml_norms and r["id"] not in cached_ids
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
            print(f"  [{item['name']}]  isDefault={item['isDefault']}")
            print(f"    {item['instruction'][:120]}")
        print()

    if to_update:
        print("--- Will UPDATE ---")
        for iid, item, changed in to_update:
            print(f"  id={iid}  [{item['name']}]  changed: {', '.join(changed)}")
        print()

    if skipped:
        print("--- Skipped ---")
        for s in skipped:
            print(f"  {s}")
        print()

    if to_delete:
        print("--- Unknown (in Wren, not in YAML) ---")
        for rec in to_delete:
            print(f"  id={rec['id']}  {rec['instruction'][:80]}")
        print()

    if args.dry_run:
        print("Dry run — nothing written.")
        return 0

    # ── Create new instructions ────────────────────────────────────────────────
    created = 0
    for item in to_create:
        result = graphql_request(
            args.endpoint,
            CREATE_INSTRUCTION_MUTATION,
            {
                "data": {
                    "instruction": item["instruction"],
                    "questions": item["questions"],
                    "isDefault": item["isDefault"],
                }
            },
        )
        new_id = result["data"]["createInstruction"]["id"]
        cache[item["name"]] = new_id
        print(f"  Created  id={new_id}  [{item['name']}]")
        created += 1

    # ── Update changed instructions ────────────────────────────────────────────
    updated = 0
    for iid, item, changed in to_update:
        graphql_request(
            args.endpoint,
            UPDATE_INSTRUCTION_MUTATION,
            {
                "where": {"id": iid},
                "data": {
                    "instruction": item["instruction"],
                    "questions": item["questions"],
                    "isDefault": item["isDefault"],
                },
            },
        )
        print(f"  Updated  id={iid}  [{item['name']}]  ({', '.join(changed)})")
        updated += 1

    # ── Delete unknown instructions ────────────────────────────────────────────
    deleted = 0
    if args.delete_unknown:
        for rec in to_delete:
            graphql_request(
                args.endpoint,
                DELETE_INSTRUCTION_MUTATION,
                {"where": {"id": rec["id"]}},
            )
            print(f"  Deleted  id={rec['id']}  {rec['instruction'][:60]}")
            deleted += 1

    # Save updated cache
    save_cache(CACHE_PATH, cache)
    print(f"\nCache saved -> {CACHE_PATH}")
    print(f"\nDone — created {created}, updated {updated}, deleted {deleted}, skipped {len(skipped)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
