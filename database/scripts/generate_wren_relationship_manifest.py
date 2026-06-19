from __future__ import annotations

import json
from pathlib import Path

try:
    import yaml as _yaml
    def _load_yaml(text: str) -> dict:
        return _yaml.safe_load(text) or {}
except ImportError:
    import re as _re
    def _load_yaml(text: str) -> dict:  # type: ignore[misc]
        """Minimal YAML loader — handles only the flat key: value pairs we need."""
        return {}


ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT / "database" / "docs" / "starrock_schema.json"
REL_PATH = ROOT / "database" / "relationships.yml"
DESC_PATH = ROOT / "database" / "descriptions.yml"
OUT_DIR = ROOT / "docker" / "data" / "mdl"
OUT_PATH = OUT_DIR / "sample.json"


def load_descriptions() -> dict:
    """Load database/descriptions.yml and return a two-level dict:
    { model_name: { "__model__": "...", col_name: "..." } }
    """
    if not DESC_PATH.exists():
        return {}
    try:
        raw = _load_yaml(DESC_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    out: dict[str, dict[str, str]] = {}
    models_section = raw.get("models", {}) if isinstance(raw, dict) else {}
    for model_name, model_data in models_section.items():
        if not isinstance(model_data, dict):
            continue
        entry: dict[str, str] = {}
        if "description" in model_data:
            entry["__model__"] = str(model_data["description"]).strip()
        cols = model_data.get("columns", {})
        if isinstance(cols, dict):
            for col_name, col_desc in cols.items():
                if col_desc:
                    entry[col_name] = str(col_desc).strip()
        out[model_name] = entry
    return out


def parse_relationships(text: str) -> list[dict]:
    rels: list[dict] = []
    current: dict | None = None
    in_models = False

    for raw in text.splitlines():
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped == "relationships:":
            continue

        if stripped.startswith("- name:"):
            if current:
                rels.append(current)
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
            current["condition"] = stripped.split(":", 1)[1].strip()
            continue

    if current:
        rels.append(current)
    return rels


def _normalize_sql_type(raw_type: str) -> str:
    """Normalize production DDL types to portable types Wren/Doris understands.

    Key rules:
    - TIME → varchar  (stored as 'HHMM' 4-char strings locally)
    - int(n) / bigint(n) → int / bigint  (strip width specifier)
    - varchar(n) → varchar  (Wren doesn't need width)
    - json → varchar  (not a Wren-native type)
    - Anything else → lowercase as-is
    """
    t = raw_type.strip().lower()
    if t == "time":
        return "varchar"
    if t == "json":
        return "varchar"
    # strip width specifiers: int(11) → int, bigint(20) → bigint, varchar(255) → varchar
    base = t.split("(")[0].strip()
    return base


def parse_columns(ddl: str) -> list[dict[str, str]]:
    def infer_type(name: str) -> str:
        if name in {"ts"}:
            return "bigint"
        if name in {"tsDt", "eventTime"}:
            return "datetime"
        if name.endswith("_seconds") or name.endswith("_count_total"):
            return "bigint"
        if name.endswith("_mb") or name.endswith("_kwh_total") or name.endswith("_kvarh_total"):
            return "bigint"
        if name.endswith("_hz") or name.endswith("_kw") or name.endswith("_factor") or name.endswith("_v") or name.endswith("_a") or name.endswith("_m3_total"):
            return "double"
        if name.endswith("_state") or name in {"fault", "mode", "tenantId", "customerId", "deviceId"}:
            return "varchar"
        return "varchar"

    if ddl.startswith("CREATE MATERIALIZED VIEW"):
        header = ddl.splitlines()[0]
        start = header.find("(")
        end = header.rfind(")")
        if start != -1 and end != -1 and end > start:
            items = [item.strip().strip("`") for item in header[start + 1 : end].split(",")]
            return [{"name": item, "type": infer_type(item)} for item in items if item]

    cols: list[dict[str, str]] = []
    for raw in ddl.splitlines():
        line = raw.strip()
        if not line.startswith("`"):
            continue
        if "`" not in line[1:]:
            continue
        name, rest = line[1:].split("`", 1)
        rest = rest.strip()
        if not rest:
            continue
        type_part = rest.split(" DEFAULT ", 1)[0]
        type_part = type_part.split(" COMMENT ", 1)[0]
        type_part = type_part.split(" NOT NULL", 1)[0]
        type_part = type_part.split(" NULL", 1)[0]
        type_part = type_part.rstrip(",").strip()
        cols.append({"name": name, "type": _normalize_sql_type(type_part)})
    return cols


def pick_schema_key(schema: dict, table_name: str) -> str:
    matches = [k for k in schema if k.endswith(f".{table_name}")]
    if not matches:
        raise KeyError(f"No schema entry found for {table_name}")
    preferred = [
        ".sdp_golden.",
        ".sdp_mart.",
        ".sdp_staging.",
        ".sdp_near_realtime.",
        ".sdp_raw.",
    ]
    for needle in preferred:
        for key in matches:
            if needle in key:
                return key
    return matches[0]


SCHEMA_BY_MODEL = {
    "stg_dmp_asset_profiles": "sdp_staging",
    "stg_dmp_assets": "sdp_staging",
    "stg_dmp_device_profiles": "sdp_staging",
    "stg_dmp_devices": "sdp_staging",
    "stg_dmp_device_status_events": "sdp_staging",
    "stg_dmp_evt_connectivity": "sdp_staging",
    "stg_dmp_relations": "sdp_staging",
    "stg_vehicle_histories": "sdp_staging",
    "dim_asset": "sdp_golden",
    "dim_asset_profile": "sdp_golden",
    "dim_date": "sdp_golden",
    "dim_device": "sdp_golden",
    "dim_device_asset": "sdp_golden",
    "dim_device_asset_snapshot": "sdp_golden",
    "dim_device_profile": "sdp_golden",
    "dim_parking_lot": "sdp_golden",
    "dim_parking_lot_snapshot": "sdp_golden",
    "dim_time": "sdp_golden",
    "fct_device_asset_assignment": "sdp_golden",
    "fct_vehicle_events": "sdp_golden",
    "fct_parking_occupancy": "sdp_mart",
    "stg_mv_dmp_tlm_camera": "sdp_near_realtime",
    "stg_mv_dmp_tlm_chiller": "sdp_near_realtime",
    "stg_mv_dmp_tlm_energy_meter": "sdp_near_realtime",
    "stg_mv_dmp_tlm_nvr": "sdp_near_realtime",
    # raw layer
    "raw_dmp_evt_connectivity": "sdp_near_realtime",
    "raw_dmp_tlm_raw": "sdp_near_realtime",
    "raw_parking_db_vehicle_histories": "sdp_raw",
}

PRIMARY_KEY_BY_MODEL = {
    # staging
    "stg_dmp_asset_profiles": "asset_profile_id",
    "stg_dmp_assets": "asset_id",
    "stg_dmp_device_profiles": "device_profile_id",
    "stg_dmp_devices": "device_id",
    "stg_dmp_device_status_events": "event_id",
    "stg_dmp_evt_connectivity": "deviceid",
    "stg_dmp_relations": "from_id",
    "stg_vehicle_histories": "event_id",
    # golden dimensions
    "dim_asset": "asset_sk",
    "dim_asset_profile": "asset_profile_sk",
    "dim_date": "date_key",
    "dim_device": "device_sk",
    "dim_device_asset": "device_sk",
    "dim_device_asset_snapshot": "device_asset_sk",
    "dim_device_profile": "device_profile_sk",
    "dim_parking_lot": "pk_lot_id",
    "dim_parking_lot_snapshot": "dbt_scd_id",
    "dim_time": "time_key",
    # golden facts
    "fct_device_asset_assignment": "device_sk",
    "fct_vehicle_events": "event_id",
    # mart
    "fct_parking_occupancy": "parking_lot_id",
    # near-realtime materialized views
    "stg_mv_dmp_tlm_camera": "deviceId",
    "stg_mv_dmp_tlm_chiller": "deviceId",
    "stg_mv_dmp_tlm_energy_meter": "deviceId",
    "stg_mv_dmp_tlm_nvr": "deviceId",
    # raw layer
    "raw_dmp_evt_connectivity": "deviceId",
    "raw_dmp_tlm_raw": "deviceId",
    "raw_parking_db_vehicle_histories": "id",
}


def main() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    rels = parse_relationships(REL_PATH.read_text(encoding="utf-8"))
    descriptions = load_descriptions()
    model_names = sorted({model for rel in rels for model in rel["models"]})

    models = []
    for model_name in model_names:
        schema_key = pick_schema_key(schema, model_name)
        schema_entry = schema[schema_key]
        cols = parse_columns(schema_entry["ddl"])
        pk = PRIMARY_KEY_BY_MODEL.get(model_name, cols[0]["name"])
        model_desc = descriptions.get(model_name, {})
        model_props = {}
        if model_desc.get("__model__"):
            model_props["description"] = model_desc["__model__"]
        models.append(
            {
                "name": model_name,
                "tableReference": {
                    "catalog": "",
                    "schema": SCHEMA_BY_MODEL[model_name],
                    "table": model_name,
                },
                "columns": [
                    {
                        "name": col["name"],
                        "type": col["type"],
                        "isCalculated": False,
                        "notNull": False,
                        "isPrimaryKey": col["name"] == pk,
                        "properties": (
                            {"description": model_desc[col["name"]]}
                            if model_desc.get(col["name"])
                            else {}
                        ),
                    }
                    for col in cols
                ],
                "primaryKey": pk,
                "cached": False,
                "properties": model_props,
            }
        )

    manifest = {
        "layoutVersion": 2,
        "catalog": "wren",
        "schema": "public",
        "dataSource": "doris",
        "models": models,
        "relationships": [
            {
                "name": rel["name"],
                "models": rel["models"],
                "joinType": rel.get("joinType", "MANY_TO_ONE"),
                "condition": rel.get("condition", ""),
            }
            for rel in rels
        ],
        "views": [],
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {OUT_PATH}")
    print(f"Models: {len(models)}")
    print(f"Relationships: {len(rels)}")


if __name__ == "__main__":
    main()
