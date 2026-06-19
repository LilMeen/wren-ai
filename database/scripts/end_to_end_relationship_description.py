from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
RELATIONSHIPS_PATH = ROOT / "database" / "relationships.yml"
DESC_PATH = ROOT / "database" / "descriptions.yml"

DEFAULT_ENDPOINT = "http://74.48.140.178:27668/api/graphql"


@dataclass(frozen=True)
class RelationshipSpec:
    name: str
    left_model: str
    left_column: str
    right_model: str
    right_column: str
    relation_type: str = "MANY_TO_ONE"
    description: str = ""


DIAGRAM_QUERY = """
query Diagram {
  diagram {
    models {
      modelId
      displayName
      sourceTableName
      referenceName
      fields {
        columnId
        displayName
        referenceName
      }
      relationFields {
        relationId
        referenceName
        fromModelDisplayName
        toModelDisplayName
        fromColumnDisplayName
        toColumnDisplayName
        type
      }
    }
  }
}
"""

SAVE_RELATIONS_MUTATION = """
mutation SaveRelations($data: SaveRelationInput!) {
  saveRelations(data: $data)
}
"""

DEPLOY_MUTATION = """
mutation Deploy($force: Boolean) {
  deploy(force: $force)
}
"""

UPDATE_MODEL_METADATA_MUTATION = """
mutation UpdateModelMetadata($where: ModelWhereInput!, $data: UpdateModelMetadataInput!) {
  updateModelMetadata(where: $where, data: $data)
}
"""

MODEL_SYNC_QUERY = """
query ModelSync {
  modelSync {
    status
  }
}
"""


def load_descriptions() -> dict[str, dict[str, str]]:
    if not DESC_PATH.exists():
        return {}
    try:
        import yaml  # type: ignore[import]
        raw = yaml.safe_load(DESC_PATH.read_text(encoding="utf-8")) or {}
    except ImportError:
        return {}
    out: dict[str, dict[str, str]] = {}
    for model_name, model_data in (raw.get("models", {}) or {}).items():
        if not isinstance(model_data, dict):
            continue
        entry: dict[str, str] = {}
        if "description" in model_data:
            entry["__model__"] = str(model_data["description"]).strip()
        for col_name, col_desc in (model_data.get("columns", {}) or {}).items():
            if col_desc:
                entry[col_name] = str(col_desc).strip()
        out[model_name] = entry
    return out


def graphql_request(
    endpoint: str,
    query: str,
    variables: dict[str, Any] | None = None,
    timeout: int = 60,
) -> dict[str, Any]:
    payload = {"query": query}
    if variables is not None:
        payload["variables"] = variables

    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GraphQL HTTP error {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Cannot reach Wren UI API at {endpoint}: {exc}") from exc

    result = json.loads(body)
    if result.get("errors"):
        raise RuntimeError(json.dumps(result["errors"], ensure_ascii=False, indent=2))
    return result


def parse_relationships(text: str) -> list[RelationshipSpec]:
    rels: list[RelationshipSpec] = []
    current: dict[str, Any] | None = None
    in_models = False

    def flush_current() -> None:
        nonlocal current
        if not current:
            return
        models = current.get("models", [])
        if len(models) == 2:
            rels.append(
                RelationshipSpec(
                    name=current["name"],
                    left_model=current.get("left_model", models[0]),
                    left_column=current.get("left_column", ""),
                    right_model=current.get("right_model", models[1]),
                    right_column=current.get("right_column", ""),
                    relation_type=current.get("joinType", "MANY_TO_ONE"),
                    description=current.get("description", ""),
                )
            )
        current = None

    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("#") or stripped == "relationships:":
            continue

        if stripped.startswith("- name:"):
            flush_current()
            current = {"name": stripped.split(":", 1)[1].strip(), "models": []}
            in_models = False
            continue

        if current is None:
            continue

        if stripped == "models:":
            in_models = True
            continue

        if in_models and stripped.startswith("-"):
            current["models"].append(stripped[1:].strip().strip("'\""))
            continue

        if stripped.startswith("join_type:"):
            current["joinType"] = stripped.split(":", 1)[1].strip()
            continue

        if stripped.startswith("condition:"):
            condition = stripped.split(":", 1)[1].strip()
            current["condition"] = condition
            if "=" in condition:
                left, right = [p.strip() for p in condition.split("=", 1)]
                if "." in left:
                    current["left_model"], current["left_column"] = left.split(".", 1)
                if "." in right:
                    current["right_model"], current["right_column"] = right.split(".", 1)
            continue

        if stripped.startswith("description:"):
            current["description"] = stripped.split(":", 1)[1].strip()
            continue

    flush_current()
    return rels


def normalize_table_name(name: str) -> str:
    return name if "." in name else f"sdp_golden.{name}"


def get_column(fields: list[dict[str, Any]], column_name: str) -> dict[str, Any] | None:
    for field in fields:
        if field["displayName"] == column_name or field["referenceName"] == column_name:
            return field
    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="End-to-end: push relationships + descriptions from YAML into Wren UI and deploy."
    )
    parser.add_argument(
        "--endpoint",
        default=DEFAULT_ENDPOINT,
        help=f"GraphQL endpoint (default: {DEFAULT_ENDPOINT})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be added without saving or deploying.",
    )
    parser.add_argument(
        "--skip-deploy",
        action="store_true",
        help="Update relationships and descriptions but skip the deploy step.",
    )
    args = parser.parse_args()

    print(f"Endpoint : {args.endpoint}")
    print(f"YAML     : {RELATIONSHIPS_PATH}")
    print(f"Desc     : {DESC_PATH}")
    print()

    # ── Load source files ──────────────────────────────────────────────────────
    relations = parse_relationships(RELATIONSHIPS_PATH.read_text(encoding="utf-8"))
    descriptions = load_descriptions()
    diagram = graphql_request(args.endpoint, DIAGRAM_QUERY)["data"]["diagram"]
    models = diagram["models"]

    print(f"Relationships in YAML : {len(relations)}")
    print(f"Models in Wren UI     : {len(models)}")
    print(f"Models in descriptions: {len(descriptions)}")
    print()

    # ── Build lookup tables ────────────────────────────────────────────────────
    model_by_table: dict[str, dict[str, Any]] = {}
    model_by_base: dict[str, dict[str, Any]] = {}
    for model in models:
        table_name = normalize_table_name(model["sourceTableName"])
        model_by_table[table_name] = model
        model_by_base.setdefault(table_name.split(".", 1)[1], model)

    # ── Diff: which relationships are missing ──────────────────────────────────
    existing = {
        (
            rel["fromModelDisplayName"],
            rel["fromColumnDisplayName"],
            rel["toModelDisplayName"],
            rel["toColumnDisplayName"],
            rel["type"],
        )
        for model in models
        for rel in model.get("relationFields", [])
    }

    to_save: list[dict[str, Any]] = []
    skipped = 0
    missing_models: list[str] = []
    missing_columns: list[str] = []

    for rel in relations:
        left_model = model_by_table.get(rel.left_model) or model_by_base.get(rel.left_model)
        right_model = model_by_table.get(rel.right_model) or model_by_base.get(rel.right_model)

        if not left_model or not right_model:
            missing_models.append(f"{rel.left_model} -> {rel.right_model}")
            continue

        left_field = get_column(left_model["fields"], rel.left_column)
        right_field = get_column(right_model["fields"], rel.right_column)
        if not left_field or not right_field:
            missing_columns.append(
                f"{rel.left_model}.{rel.left_column} -> {rel.right_model}.{rel.right_column}"
            )
            continue

        key = (
            left_model["displayName"],
            left_field["displayName"],
            right_model["displayName"],
            right_field["displayName"],
            rel.relation_type,
        )
        if key in existing:
            skipped += 1
            continue

        to_save.append({
            "fromModelId": left_model["modelId"],
            "fromColumnId": left_field["columnId"],
            "toModelId": right_model["modelId"],
            "toColumnId": right_field["columnId"],
            "type": rel.relation_type,
        })

    print(f"Already exist (skip)  : {skipped}")
    print(f"To add                : {len(to_save)}")

    if missing_models:
        print("\nMissing models:")
        for item in missing_models:
            print(f"  - {item}")

    if missing_columns:
        print("\nMissing columns:")
        for item in missing_columns:
            print(f"  - {item}")

    if args.dry_run:
        print("\nDry run — nothing saved.")
        return 0

    # ── Save new relationships ─────────────────────────────────────────────────
    if to_save:
        result = graphql_request(
            args.endpoint,
            SAVE_RELATIONS_MUTATION,
            {"data": {"relations": to_save}},
        )
        print(f"\nSaved relations: {len(result['data']['saveRelations'])}")
    else:
        print("\nNo new relations to save.")

    # ── Refresh diagram after save ─────────────────────────────────────────────
    fresh_diagram = graphql_request(args.endpoint, DIAGRAM_QUERY)["data"]["diagram"]

    # ── Build relationship description lookup ──────────────────────────────────
    # Match by (left_table, left_col, right_table, right_col, type) —
    # rf["referenceName"] uses schema-prefixed names that don't match YAML names.
    rel_desc_lookup: dict[tuple, str] = {
        (r.left_model, r.left_column, r.right_model, r.right_column, r.relation_type): r.description
        for r in relations
        if r.description
    }

    seen_rel_ids: set[int] = set()
    model_rel_updates: dict[int, list[dict[str, Any]]] = {}
    for model in fresh_diagram["models"]:
        for rf in model.get("relationFields", []):
            rel_id = rf["relationId"]
            if rel_id in seen_rel_ids:
                continue
            from_table = rf["fromModelDisplayName"].split(".")[-1]
            to_table = rf["toModelDisplayName"].split(".")[-1]
            from_col = rf.get("fromColumnDisplayName", "")
            to_col = rf.get("toColumnDisplayName", "")
            rel_type = rf.get("type", "")
            desc = rel_desc_lookup.get((from_table, from_col, to_table, to_col, rel_type))
            if desc:
                seen_rel_ids.add(rel_id)
                model_id = model["modelId"]
                model_rel_updates.setdefault(model_id, []).append(
                    {"id": rel_id, "description": desc}
                )

    # ── Build model + column description updates ───────────────────────────────
    model_desc_updates: dict[int, dict[str, Any]] = {}
    for model in fresh_diagram["models"]:
        table_name = model.get("sourceTableName", "")
        base_name = table_name.split(".")[-1] if "." in table_name else table_name
        model_desc = descriptions.get(base_name, {})

        data: dict[str, Any] = {}
        if model_desc.get("__model__"):
            data["description"] = model_desc["__model__"]

        col_updates = []
        for field in model.get("fields", []):
            col_ref = field.get("referenceName", "")
            if col_ref in model_desc:
                col_updates.append({"id": field["columnId"], "description": model_desc[col_ref]})
        if col_updates:
            data["columns"] = col_updates

        if model["modelId"] in model_rel_updates:
            data["relationships"] = model_rel_updates.pop(model["modelId"])

        if data:
            model_desc_updates[model["modelId"]] = data

    # Any remaining relationship-only updates (model not in descriptions.yml)
    for model_id, rel_updates in model_rel_updates.items():
        model_desc_updates.setdefault(model_id, {})["relationships"] = rel_updates

    # ── Apply metadata updates ─────────────────────────────────────────────────
    if model_desc_updates:
        for model_id, data in model_desc_updates.items():
            graphql_request(
                args.endpoint,
                UPDATE_MODEL_METADATA_MUTATION,
                {"where": {"id": model_id}, "data": data},
            )
        print(f"Updated metadata on {len(model_desc_updates)} models")
    else:
        print("No metadata to update.")

    # ── Deploy ─────────────────────────────────────────────────────────────────
    if args.skip_deploy:
        print("\nSkipping deploy (--skip-deploy).")
        return 0

    print("\nDeploying...")
    deploy_result = graphql_request(
        args.endpoint, DEPLOY_MUTATION, {"force": False}, timeout=120
    )
    print("Deploy result:")
    print(json.dumps(deploy_result["data"]["deploy"], ensure_ascii=False, indent=2))

    sync_result = graphql_request(args.endpoint, MODEL_SYNC_QUERY)
    print("Sync status:")
    print(json.dumps(sync_result["data"]["modelSync"], ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
