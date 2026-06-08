"""
gen_mock.py
===========
Generate schema + mock data for all 17 StarRocks tables (Starrock_Schema.txt).

Outputs:
  - schema.sql   → copy to init/01_schema.sql
  - mock_data.sql → copy to init/02_mock_data.sql
"""

from __future__ import annotations

import csv
import random
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

from schema_gen import SCHEMA_SQL, TABLES

# ── Config ────────────────────────────────────────────────────────────────────
DIR = Path(__file__).parent
CSV_FILE = DIR / "dmp_public_device.csv"
SCHEMA_FILE = DIR / "schema.sql"
OUTPUT_FILE = DIR / "mock_data.sql"
INIT_SCHEMA = DIR.parent / "Deploy_database" / "local-dev" / "init" / "01_schema.sql"
INIT_MOCK = DIR.parent / "Deploy_database" / "local-dev" / "init" / "02_mock_data.sql"

TENANT_ID = "66f096d8-521b-4090-8052-c188b08821d5"
CUSTOMER_ID = "56a0d760-490d-11f1-a19f-b52b73e46bf7"
NS = uuid.UUID(TENANT_ID)
DBT_LOADED_AT = "2026-06-08 06:00:00"
PROCESSING_DAY = "2026-06-01"
CREATED_MS = 1778500000000

START_DT = datetime(2026, 5, 8, 0, 0, 0)
END_DT = datetime(2026, 6, 8, 23, 0, 0)
UTC7_OFFSET_SECONDS = 7 * 3600
BATCH_SIZE = 500
PARKING_ROWS = 120
STATUS_EVENT_SAMPLE_EVERY = 6  # hours between status events per device

random.seed(42)

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]
MONTH_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

PARKING_LOTS = [
    ("LOT-TNP-B1", "TNP Basement 1", "EP-IN-01", "Lane In 1", "EP-OUT-01", "Lane Out 1"),
    ("LOT-TNP-B2", "TNP Basement 2", "EP-IN-02", "Lane In 2", "EP-OUT-02", "Lane Out 2"),
    ("LOT-KSX-XM1", "KSX XM1 Parking", "EP-IN-03", "XM1 Entry", "EP-OUT-03", "XM1 Exit"),
]
VEHICLE_TYPES = ["car", "motorbike", "suv"]
LPNS = ["30A-12345", "51G-67890", "29B-11223", "43C-44556", "15F-77889",
        "60K-33445", "92H-55667", "17A-88990", "20B-10101", "99Z-20202"]


def uid(name: str) -> str:
    return str(uuid.uuid5(NS, name))


def escape_sq(s: str) -> str:
    return s.replace("'", "''")


def sql_val(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return str(v)
    if isinstance(v, date) and not isinstance(v, datetime):
        return f"'{v.isoformat()}'"
    if isinstance(v, datetime):
        return f"'{v.strftime('%Y-%m-%d %H:%M:%S')}'"
    return f"'{escape_sq(str(v))}'"


def ts_to_epoch_ms(dt: datetime) -> int:
    return int((dt - datetime(1970, 1, 1)).total_seconds() * 1000) - UTC7_OFFSET_SECONDS * 1000


def ms_to_dt_str(ms: int) -> str:
    dt = datetime(1970, 1, 1) + timedelta(milliseconds=ms + UTC7_OFFSET_SECONDS * 1000)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def write_batches(f, table: str, columns: list[str], rows: list[str]) -> None:
    if not rows:
        return
    col_str = ", ".join(f"`{c}`" for c in columns)
    for i in range(0, len(rows), BATCH_SIZE):
        chunk = rows[i : i + BATCH_SIZE]
        f.write(f"INSERT INTO `{table}`\n({col_str})\nVALUES\n")
        f.write(",\n".join(chunk))
        f.write(";\n\n")


def make_connectivity(dt: datetime, device_idx: int) -> dict:
    hour = dt.hour
    offline_prob = 0.08 if hour < 6 or hour >= 23 else 0.03
    rng = random.Random(device_idx * 1_000_000 + int(dt.timestamp()))
    is_online = rng.random() > offline_prob
    status = "ONLINE" if is_online else "OFFLINE"
    msg_type = "CONNECT" if is_online else "DISCONNECT"
    quality = rng.randint(75, 99) if is_online else rng.randint(0, 40)
    offline_reason = None if is_online else rng.choice(
        ["NETWORK_TIMEOUT", "DEVICE_UNREACHABLE", "HEARTBEAT_MISSED"]
    )
    return {
        "msg_type": msg_type,
        "status": status,
        "active": is_online,
        "quality_score": quality,
        "offline_reason": offline_reason,
        "icmp_reachable": is_online and rng.random() > 0.05,
    }


@dataclass
class AssetProfile:
    id: str
    name: str
    description: str
    is_default: bool


@dataclass
class Asset:
    id: str
    name: str
    label: str
    asset_type: str
    asset_profile_id: str


@dataclass
class DeviceProfile:
    id: str
    name: str
    dtype: str
    transport_type: str
    is_default: bool


@dataclass
class Device:
    id: str
    name: str
    dtype: str
    label: str
    device_profile_id: str


def load_devices() -> list[Device]:
    devices: list[Device] = []
    seen: set[str] = set()
    with open(CSV_FILE, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row["type"] in seen:
                continue
            seen.add(row["type"])
            profile_id = row["device_profile_id"] or uid(f"profile-{row['type']}")
            devices.append(Device(
                id=row["id"],
                name=row["name"],
                dtype=row["type"],
                label=row.get("label") or "",
                device_profile_id=profile_id,
            ))
    return devices


def build_master_data(devices: list[Device]) -> dict:
    asset_profiles = [
        AssetProfile(uid("ap-bms"), "BMS Asset Profile", "Building management assets", True),
        AssetProfile(uid("ap-camera"), "Camera Asset Profile", "Surveillance assets", False),
        AssetProfile(uid("ap-parking"), "Parking Asset Profile", "Parking zone assets", False),
    ]
    assets = [
        Asset(uid("asset-hvac-1"), "HVAC Zone A", "Zone A", "hvac-zone", asset_profiles[0].id),
        Asset(uid("asset-hvac-2"), "HVAC Zone B", "Zone B", "hvac-zone", asset_profiles[0].id),
        Asset(uid("asset-light-1"), "Lighting Floor 1", "L1", "lighting", asset_profiles[0].id),
        Asset(uid("asset-cam-1"), "Camera Tower 1", "Tower 1", "camera-tower", asset_profiles[1].id),
        Asset(uid("asset-cam-2"), "Camera Tower 2", "Tower 2", "camera-tower", asset_profiles[1].id),
        Asset(uid("asset-nvr-1"), "NVR Room S1", "NVR S1", "nvr-room", asset_profiles[1].id),
        Asset(uid("asset-pk-1"), "Parking Basement 1", "B1", "parking-lot", asset_profiles[2].id),
        Asset(uid("asset-pk-2"), "Parking Basement 2", "B2", "parking-lot", asset_profiles[2].id),
        Asset(uid("asset-pk-gw"), "Parking Gateway Zone", "GW", "parking-gateway", asset_profiles[2].id),
        Asset(uid("asset-lobby"), "Main Lobby", "Lobby", "common-area", asset_profiles[0].id),
    ]
    profile_ids = {d.device_profile_id for d in devices}
    device_profiles = []
    for i, pid in enumerate(sorted(profile_ids)):
        sample = next(d for d in devices if d.device_profile_id == pid)
        device_profiles.append(DeviceProfile(
            id=pid,
            name=f"Profile {sample.dtype}",
            dtype=sample.dtype,
            transport_type="MQTT" if "bms" in sample.dtype.lower() else "DEFAULT",
            is_default=i == 0,
        ))
    relations = []
    for i, dev in enumerate(devices):
        asset = assets[i % len(assets)]
        relations.append({
            "from_id": dev.id,
            "from_type": "DEVICE",
            "to_id": asset.id,
            "to_type": "ASSET",
            "relation_type_group": "COMMON",
            "relation_type": "Contains",
        })
    return {
        "asset_profiles": asset_profiles,
        "assets": assets,
        "device_profiles": device_profiles,
        "devices": devices,
        "relations": relations,
    }


def iter_dates() -> list[date]:
    days: list[date] = []
    cur = START_DT.date()
    end = END_DT.date()
    while cur <= end:
        days.append(cur)
        cur += timedelta(days=1)
    return days


def make_dim_date_rows(days: list[date]) -> list[str]:
    rows = []
    for d in days:
        dow = d.weekday()
        rows.append("(" + ", ".join([
            sql_val(d.year * 10000 + d.month * 100 + d.day),
            sql_val(d),
            sql_val(d.year),
            sql_val((d.month - 1) // 3 + 1),
            sql_val(d.month),
            sql_val(d.day),
            sql_val(f"{d.year}-{d.month:02d}"),
            sql_val(f"{d.year}-W{d.isocalendar()[1]:02d}"),
            sql_val(d.timetuple().tm_yday),
            sql_val(dow + 1),
            sql_val(DAY_NAMES[dow]),
            sql_val(DAY_SHORT[dow]),
            sql_val(dow >= 5),
            sql_val(MONTH_NAMES[d.month]),
            sql_val(MONTH_SHORT[d.month]),
        ]) + ")")
    return rows


def make_parking_raw_row(i: int, lot: tuple, lpn: str, check_in: datetime, check_out: datetime) -> str:
    lot_id, lot_name, ep_in, lane_in, ep_out, lane_out = lot
    duration_min = int((check_out - check_in).total_seconds() // 60)
    fee = random.randint(10000, 80000)
    evt_id = uid(f"parking-{i}")
    return "(" + ", ".join([
        sql_val(evt_id),
        sql_val(f"CARD-{1000 + i}"),
        sql_val(lpn),
        sql_val(lpn.replace("-", "")),
        sql_val(lpn), sql_val("false"),
        sql_val(lpn), sql_val("false"),
        sql_val(uid("svc-parking")), sql_val("Hourly Parking"),
        sql_val(CUSTOMER_ID), sql_val("TNP"), sql_val("Technopark"),
        sql_val(lot_id), sql_val(lot_name),
        sql_val(uid(ep_in)), sql_val(lane_in),
        sql_val(uid("lane-in")), sql_val("Entry Lane"),
        sql_val(uid(ep_out)), sql_val(lane_out),
        sql_val(uid("lane-out")), sql_val("Exit Lane"),
        sql_val("IN_OUT"),
        sql_val(check_in.strftime("%Y-%m-%d %H:%M:%S")),
        sql_val(check_out.strftime("%Y-%m-%d %H:%M:%S")),
        sql_val(random.choice(["WALLET", "CASH", "BANK"])),
        sql_val(random.random() < 0.2),
        sql_val(500000), sql_val(500000 - fee),
        sql_val(0), sql_val(0),
        sql_val(fee), sql_val(0), sql_val(0), sql_val(0),
        sql_val(fee), sql_val(0),
        sql_val("AUTO"), sql_val("AUTO"),
        sql_val(uid(f"img-in-{i}")), sql_val(uid(f"img-out-{i}")),
        sql_val("COMPLETED"), sql_val("Normal exit"),
        sql_val(uid("area-1")),
        sql_val(uid("pc-in")), sql_val(uid("pc-out")),
        sql_val(uid("haunt-1")), sql_val("TNP Tower"),
        sql_val(random.choice(VEHICLE_TYPES)),
        sql_val(duration_min),
        sql_val(False),
        sql_val("PARKING"),
        sql_val(None), sql_val(None),
        sql_val(False),
        sql_val(uid("user-1")), sql_val("operator"),
        sql_val(uid("user-1")), sql_val("operator"),
        sql_val(check_in.strftime("%Y-%m-%d %H:%M:%S")),
        sql_val(check_out.strftime("%Y-%m-%d %H:%M:%S")),
        sql_val(None), sql_val(None), sql_val(None), sql_val(None),
        sql_val(CUSTOMER_ID), sql_val(CUSTOMER_ID),
        sql_val(check_in.strftime("%Y-%m-%d")),
    ]) + ")"


def make_parking_stg_row(i: int, lot: tuple, lpn: str, check_in: datetime, check_out: datetime) -> str:
    lot_id, lot_name, ep_in, lane_in, ep_out, lane_out = lot
    duration_ms = int((check_out - check_in).total_seconds() * 1000)
    fee = random.randint(10000, 80000)
    evt_id = uid(f"parking-{i}")
    cin_s = check_in.strftime("%Y-%m-%d %H:%M:%S")
    cout_s = check_out.strftime("%Y-%m-%d %H:%M:%S")
    return "(" + ", ".join([
        sql_val(evt_id),
        sql_val(f"CARD-{1000 + i}"),
        sql_val(lpn), sql_val(lpn.replace("-", "")),
        sql_val(lpn), sql_val("false"), sql_val(lpn), sql_val("false"),
        sql_val(uid("svc-parking")), sql_val("Hourly Parking"),
        sql_val(CUSTOMER_ID), sql_val("TNP"), sql_val("Technopark"),
        sql_val(lot_id), sql_val(lot_name),
        sql_val(uid(ep_in)), sql_val(lane_in),
        sql_val(uid("lane-in")), sql_val("Entry Lane"),
        sql_val(uid(ep_out)), sql_val(lane_out),
        sql_val(uid("lane-out")), sql_val("Exit Lane"),
        sql_val("IN_OUT"),
        sql_val(cin_s), sql_val(cout_s),
        sql_val(check_in), sql_val(check_out),
        sql_val(random.choice(["WALLET", "CASH", "BANK"])),
        sql_val(str(random.random() < 0.2).lower()),
        sql_val("500000"), sql_val(str(500000 - fee)),
        sql_val("0"), sql_val("0"),
        sql_val(str(fee)), sql_val("0"), sql_val("0"), sql_val("0"),
        sql_val(str(fee)), sql_val("0"),
        sql_val("AUTO"), sql_val("AUTO"),
        sql_val(uid(f"img-in-{i}")), sql_val(uid(f"img-out-{i}")),
        sql_val("COMPLETED"), sql_val("Normal exit"),
        sql_val(uid("area-1")),
        sql_val(uid("pc-in")), sql_val(uid("pc-out")),
        sql_val(uid("haunt-1")), sql_val("TNP Tower"),
        sql_val(random.choice(VEHICLE_TYPES)),
        sql_val(duration_ms),
        sql_val("false"), sql_val("PARKING"),
        sql_val(None), sql_val(None), sql_val("false"),
        sql_val(uid("user-1")), sql_val("operator"),
        sql_val(uid("user-1")), sql_val("operator"),
        sql_val(check_in), sql_val(check_out),
        sql_val(None), sql_val(None), sql_val(None), sql_val(None),
        sql_val(CUSTOMER_ID), sql_val(CUSTOMER_ID),
        sql_val(check_in.date()),
        sql_val(DBT_LOADED_AT),
    ]) + ")"


def generate_all(devices: list[Device], master: dict) -> dict[str, list[str]]:
    data: dict[str, list[str]] = {t: [] for t in TABLES}
    days = iter_dates()

    # ── Master / Raw Hive ─────────────────────────────────────────────────────
    for ap in master["asset_profiles"]:
        data["sdp_dev_hive_catalog.sdp_raw.raw_dmp_public_asset_profile"].append("(" + ", ".join([
            sql_val(ap.id), sql_val(CREATED_MS), sql_val(ap.name), sql_val(None),
            sql_val(ap.description), sql_val(ap.is_default), sql_val(TENANT_ID),
            sql_val(None), sql_val(None), sql_val(None), sql_val(None),
            sql_val(None), sql_val(1), sql_val(PROCESSING_DAY),
        ]) + ")")

    for a in master["assets"]:
        data["sdp_dev_hive_catalog.sdp_raw.raw_dmp_public_asset"].append("(" + ", ".join([
            sql_val(a.id), sql_val(CREATED_MS), sql_val(None), sql_val(CUSTOMER_ID),
            sql_val(a.asset_profile_id), sql_val(a.name), sql_val(a.label),
            sql_val(TENANT_ID), sql_val(a.asset_type), sql_val(None), sql_val(1),
            sql_val(PROCESSING_DAY),
        ]) + ")")

    for dp in master["device_profiles"]:
        data["sdp_dev_hive_catalog.sdp_raw.raw_dmp_public_device_profile"].append("(" + ", ".join([
            sql_val(dp.id), sql_val(CREATED_MS), sql_val(dp.name), sql_val(dp.dtype),
            sql_val(None), sql_val(dp.transport_type), sql_val("DEFAULT"),
            sql_val(None), sql_val(f"Device profile for {dp.dtype}"),
            sql_val(dp.is_default), sql_val(TENANT_ID),
            sql_val(None), sql_val(None), sql_val(None), sql_val(None),
            sql_val(None), sql_val(None), sql_val(None), sql_val(None), sql_val(1),
            sql_val(PROCESSING_DAY),
        ]) + ")")

    for d in master["devices"]:
        data["sdp_dev_hive_catalog.sdp_raw.raw_dmp_public_device"].append("(" + ", ".join([
            sql_val(d.id), sql_val(CREATED_MS), sql_val(None), sql_val(CUSTOMER_ID),
            sql_val(d.device_profile_id), sql_val(None), sql_val(d.dtype),
            sql_val(d.name), sql_val(d.label or None), sql_val(TENANT_ID),
            sql_val(None), sql_val(None), sql_val(None), sql_val(1),
            sql_val(PROCESSING_DAY),
        ]) + ")")

    for rel in master["relations"]:
        data["sdp_dev_hive_catalog.sdp_raw.raw_dmp_public_relation"].append("(" + ", ".join([
            sql_val(rel["from_id"]), sql_val(rel["from_type"]),
            sql_val(rel["to_id"]), sql_val(rel["to_type"]),
            sql_val(rel["relation_type_group"]), sql_val(rel["relation_type"]),
            sql_val(None), sql_val(1), sql_val(PROCESSING_DAY),
        ]) + ")")

    for i in range(PARKING_ROWS):
        lot = PARKING_LOTS[i % len(PARKING_LOTS)]
        lpn = LPNS[i % len(LPNS)]
        day = days[i % len(days)]
        check_in = datetime.combine(day, datetime.min.time()) + timedelta(hours=8 + (i % 10))
        check_out = check_in + timedelta(hours=1 + (i % 4), minutes=15 * (i % 3))
        data["sdp_dev_hive_catalog.sdp_raw.raw_parking_db_vehicle_histories"].append(
            make_parking_raw_row(i, lot, lpn, check_in, check_out)
        )
        data["sdp_dev_iceberg_catalog.sdp_staging.stg_vehicle_histories"].append(
            make_parking_stg_row(i, lot, lpn, check_in, check_out)
        )

    # ── Staging DMP ───────────────────────────────────────────────────────────
    for ap in master["asset_profiles"]:
        data["sdp_dev_iceberg_catalog.sdp_staging.stg_dmp_asset_profiles"].append("(" + ", ".join([
            sql_val(ap.id), sql_val(ap.name), sql_val(None), sql_val(ap.description),
            sql_val(ap.is_default), sql_val(TENANT_ID),
            sql_val(None), sql_val(None), sql_val(None), sql_val(None),
            sql_val(None), sql_val(1), sql_val(PROCESSING_DAY),
            sql_val(ms_to_dt_str(CREATED_MS)), sql_val(DBT_LOADED_AT),
        ]) + ")")

    for a in master["assets"]:
        data["sdp_dev_iceberg_catalog.sdp_staging.stg_dmp_assets"].append("(" + ", ".join([
            sql_val(a.id), sql_val(None), sql_val(CUSTOMER_ID), sql_val(a.asset_profile_id),
            sql_val(a.name), sql_val(a.label), sql_val(TENANT_ID), sql_val(a.asset_type),
            sql_val(None), sql_val(1), sql_val(PROCESSING_DAY),
            sql_val(ms_to_dt_str(CREATED_MS)), sql_val(DBT_LOADED_AT),
        ]) + ")")

    for dp in master["device_profiles"]:
        data["sdp_dev_iceberg_catalog.sdp_staging.stg_dmp_device_profiles"].append("(" + ", ".join([
            sql_val(dp.id), sql_val(dp.name), sql_val(dp.dtype), sql_val(None),
            sql_val(dp.transport_type), sql_val("DEFAULT"), sql_val(None),
            sql_val(f"Device profile for {dp.dtype}"), sql_val(dp.is_default),
            sql_val(TENANT_ID), sql_val(None), sql_val(None),
            sql_val(None), sql_val(None), sql_val(None), sql_val(None),
            sql_val(None), sql_val(None), sql_val(1), sql_val(PROCESSING_DAY),
            sql_val(ms_to_dt_str(CREATED_MS)), sql_val(DBT_LOADED_AT),
        ]) + ")")

    for d in master["devices"]:
        data["sdp_dev_iceberg_catalog.sdp_staging.stg_dmp_devices"].append("(" + ", ".join([
            sql_val(d.id), sql_val(None), sql_val(CUSTOMER_ID), sql_val(d.device_profile_id),
            sql_val(None), sql_val(d.dtype), sql_val(d.name), sql_val(d.label or None),
            sql_val(TENANT_ID), sql_val(None), sql_val(None), sql_val(None), sql_val(1),
            sql_val(PROCESSING_DAY), sql_val(ms_to_dt_str(CREATED_MS)), sql_val(DBT_LOADED_AT),
        ]) + ")")

    for rel in master["relations"]:
        data["sdp_dev_iceberg_catalog.sdp_staging.stg_dmp_relations"].append("(" + ", ".join([
            sql_val(rel["from_id"]), sql_val(rel["from_type"]),
            sql_val(rel["to_id"]), sql_val(rel["to_type"]),
            sql_val(rel["relation_type_group"]), sql_val(rel["relation_type"]),
            sql_val(None), sql_val(1), sql_val(PROCESSING_DAY), sql_val(DBT_LOADED_AT),
        ]) + ")")

    # ── Golden ────────────────────────────────────────────────────────────────
    for ap in master["asset_profiles"]:
        data["sdp_dev_iceberg_catalog.sdp_golden.dim_asset_profile"].append("(" + ", ".join([
            sql_val(uid(f"sk-{ap.id}")), sql_val(ap.id), sql_val(ap.name),
            sql_val(ap.description), sql_val(ap.is_default), sql_val(TENANT_ID),
            sql_val(None), sql_val(None), sql_val(None), sql_val(None),
            sql_val(None), sql_val(ms_to_dt_str(CREATED_MS)), sql_val(DBT_LOADED_AT),
        ]) + ")")

    ap_by_id = {ap.id: ap for ap in master["asset_profiles"]}
    for a in master["assets"]:
        ap = ap_by_id[a.asset_profile_id]
        data["sdp_dev_iceberg_catalog.sdp_golden.dim_asset"].append("(" + ", ".join([
            sql_val(uid(f"sk-{a.id}")), sql_val(a.id), sql_val(a.name), sql_val(a.label),
            sql_val(a.asset_type), sql_val(None), sql_val(CUSTOMER_ID), sql_val(TENANT_ID),
            sql_val(None), sql_val(a.asset_profile_id), sql_val(ap.name),
            sql_val(ap.description), sql_val(ap.is_default),
            sql_val(None), sql_val(None), sql_val(None), sql_val(None),
            sql_val(ms_to_dt_str(CREATED_MS)), sql_val(DBT_LOADED_AT),
        ]) + ")")

    data["sdp_dev_iceberg_catalog.sdp_golden.dim_date"] = make_dim_date_rows(days)

    # ── Staging connectivity + status events (hourly) ─────────────────────────
    time_slots: list[datetime] = []
    cur = START_DT
    while cur <= END_DT:
        time_slots.append(cur)
        cur += timedelta(hours=1)

    prev_status: dict[str, str] = {}

    for slot_idx, dt in enumerate(time_slots):
        ts_ms = ts_to_epoch_ms(dt)
        ts_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        day_key = dt.strftime("%Y-%m-%d")

        for dev_idx, d in enumerate(devices):
            conn = make_connectivity(dt, dev_idx)

            data["sdp_dev_iceberg_catalog.sdp_staging.stg_dmp_evt_connectivity"].append("(" + ", ".join([
                sql_val(conn["msg_type"]), sql_val(d.id), sql_val(TENANT_ID),
                sql_val(CUSTOMER_ID), sql_val(d.name), sql_val(conn["status"]),
                sql_val(conn["offline_reason"]), sql_val(conn["quality_score"]),
                sql_val(str(conn["icmp_reachable"]).lower()), sql_val(ts_ms), sql_val(day_key),
            ]) + ")")

            if slot_idx % STATUS_EVENT_SAMPLE_EVERY == 0:
                prev = prev_status.get(d.id, "ONLINE")
                changed = prev != conn["status"]
                if changed or slot_idx == 0:
                    evt_id = uid(f"evt-{d.id}-{ts_ms}")
                    data["sdp_dev_iceberg_catalog.sdp_staging.stg_dmp_device_status_events"].append("(" + ", ".join([
                        sql_val(evt_id), sql_val(d.id), sql_val(TENANT_ID),
                        sql_val("CONNECTIVITY"), sql_val("DMP"),
                        sql_val(d.name), sql_val(d.dtype),
                        sql_val(f"10.0.{(dev_idx % 250) + 1}.{(slot_idx % 250) + 1}"),
                        sql_val(conn["status"]), sql_val(prev),
                        sql_val(conn["offline_reason"] or "STATUS_UPDATE"),
                        sql_val(ts_str), sql_val(dt.date()), sql_val(ts_str),
                        sql_val(dt.date()), sql_val(conn["active"]),
                        sql_val(changed), sql_val(DBT_LOADED_AT),
                    ]) + ")")
                prev_status[d.id] = conn["status"]

        if (slot_idx + 1) % 200 == 0:
            print(f"  staging events: {slot_idx + 1}/{len(time_slots)} slots")

    return data


def write_schema() -> None:
    SCHEMA_FILE.write_text(SCHEMA_SQL, encoding="utf-8")
    INIT_SCHEMA.parent.mkdir(parents=True, exist_ok=True)
    INIT_SCHEMA.write_text(SCHEMA_SQL, encoding="utf-8")
    print(f"Schema written: {SCHEMA_FILE}")
    print(f"Schema copied:  {INIT_SCHEMA}")


def write_mock_data(data: dict[str, list[str]], devices: list[Device]) -> None:
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write("-- ==========================================\n")
        out.write("-- MOCK DATA FOR ALL 17 STARROCKS TABLES\n")
        out.write(f"-- Period : {START_DT.date()} → {END_DT.date()}\n")
        out.write(f"-- Devices: {len(devices)} (1 per type)\n")
        out.write("-- Generated by gen_mock.py\n")
        out.write("-- ==========================================\n\n")
        for table in TABLES:
            rows = data.get(table, [])
            if not rows:
                print(f"  WARNING: no rows for {table}")
                continue
            short = table.split(".")[-1]
            out.write(f"-- ── {short} ({len(rows):,} rows) ──\n")
            cols = _columns_for_table(table)
            write_batches(out, table, cols, rows)
            print(f"  {short}: {len(rows):,} rows")

    INIT_MOCK.parent.mkdir(parents=True, exist_ok=True)
    INIT_MOCK.write_bytes(OUTPUT_FILE.read_bytes())
    print(f"\nMock data written: {OUTPUT_FILE}")
    print(f"Mock data copied:  {INIT_MOCK}")


def _columns_for_table(table: str) -> list[str]:
    mapping = {
        "raw_dmp_public_asset_profile": [
            "id", "created_time", "name", "image", "description", "is_default",
            "tenant_id", "default_rule_chain_id", "default_dashboard_id",
            "default_queue_name", "default_edge_rule_chain_id", "external_id",
            "version", "processing_day",
        ],
        "raw_dmp_public_asset": [
            "id", "created_time", "additional_info", "customer_id", "asset_profile_id",
            "name", "label", "tenant_id", "type", "external_id", "version", "processing_day",
        ],
        "raw_dmp_public_device_profile": [
            "id", "created_time", "name", "type", "image", "transport_type",
            "provision_type", "profile_data", "description", "is_default", "tenant_id",
            "firmware_id", "software_id", "default_rule_chain_id", "default_dashboard_id",
            "default_queue_name", "provision_device_key", "default_edge_rule_chain_id",
            "external_id", "version", "processing_day",
        ],
        "raw_dmp_public_device": [
            "id", "created_time", "additional_info", "customer_id", "device_profile_id",
            "device_data", "type", "name", "label", "tenant_id", "firmware_id",
            "software_id", "external_id", "version", "processing_day",
        ],
        "raw_dmp_public_relation": [
            "from_id", "from_type", "to_id", "to_type", "relation_type_group",
            "relation_type", "additional_info", "version", "processing_day",
        ],
        "raw_parking_db_vehicle_histories": [
            "id", "card_number", "lpn", "lpn_cmp", "lpn_camera_in", "lpn_in_edited",
            "lpn_camera_out", "lpn_out_edited", "service_id", "service_name",
            "owner_customer_id", "org_unit_code", "org_unit_name", "pk_lot_id", "pk_lot_name",
            "entry_point_in_id", "entry_point_in_name", "lane_in_id", "lane_in_name",
            "entry_point_out_id", "entry_point_out_name", "lane_out_id", "lane_out_name",
            "direction_type", "check_in_at", "check_out_at", "payment_type", "use_voucher",
            "wallet_balance_before", "wallet_balance_after", "total_topup", "bank_transfer",
            "parking_fee", "lost_card_fee", "promotion_amount", "promotion_vinfast_amount",
            "amount_due", "used_change", "open_mode_in", "open_mode_out",
            "check_in_lane_image_id", "check_out_lane_image_id", "history_state", "description",
            "area_id", "computer_inid", "computer_outid", "haunt_id", "haunt_name",
            "vehicle_type", "park_duration", "has_manual_edits", "service_category",
            "check_in_note", "check_out_note", "is_exception", "created_by_user_id",
            "created_by_username", "last_modified_by_user_id", "last_modified_by_username",
            "created_at", "last_modified_at", "face_id_in", "face_id_out",
            "feature_vector_in", "feature_vector_out", "checkin_customer_id",
            "checkout_customer_id", "processing_day",
        ],
        "stg_dmp_asset_profiles": [
            "asset_profile_id", "name", "image", "description", "is_default", "tenant_id",
            "default_rule_chain_id", "default_dashboard_id", "default_queue_name",
            "default_edge_rule_chain_id", "external_id", "version", "processing_day",
            "created_at", "_dbt_loaded_at",
        ],
        "stg_dmp_assets": [
            "asset_id", "additional_info", "customer_id", "asset_profile_id", "name", "label",
            "tenant_id", "type", "external_id", "version", "processing_day",
            "created_at", "_dbt_loaded_at",
        ],
        "stg_dmp_device_profiles": [
            "device_profile_id", "name", "type", "image", "transport_type", "provision_type",
            "profile_data", "description", "is_default", "tenant_id", "firmware_id",
            "software_id", "default_rule_chain_id", "default_dashboard_id",
            "default_queue_name", "provision_device_key", "default_edge_rule_chain_id",
            "external_id", "version", "processing_day", "created_at", "_dbt_loaded_at",
        ],
        "stg_dmp_devices": [
            "device_id", "additional_info", "customer_id", "device_profile_id", "device_data",
            "type", "name", "label", "tenant_id", "firmware_id", "software_id", "external_id",
            "version", "processing_day", "created_at", "_dbt_loaded_at",
        ],
        "stg_dmp_relations": [
            "from_id", "from_type", "to_id", "to_type", "relation_type_group",
            "relation_type", "additional_info", "version", "processing_day", "_dbt_loaded_at",
        ],
        "stg_dmp_device_status_events": [
            "event_id", "device_id", "tenant_id", "event_type", "source_system",
            "device_code", "device_type", "ip_address", "current_status", "previous_status",
            "status_change_reason", "event_time", "event_date", "event_hour",
            "processing_day", "is_online", "is_status_change_event", "_dbt_loaded_at",
        ],
        "stg_dmp_evt_connectivity": [
            "msgtype", "deviceid", "tenantid", "customerid", "devicecode", "status",
            "offlinereason", "qualityscore", "icmpreachable", "ts", "processing_day",
        ],
        "stg_vehicle_histories": [
            "event_id", "card_number", "lpn", "lpn_cmp", "lpn_camera_in", "lpn_in_edited",
            "lpn_camera_out", "lpn_out_edited", "service_id", "service_name",
            "owner_customer_id", "org_unit_code", "org_unit_name", "pk_lot_id", "pk_lot_name",
            "entry_point_in_id", "entry_point_in_name", "lane_in_id", "lane_in_name",
            "entry_point_out_id", "entry_point_out_name", "lane_out_id", "lane_out_name",
            "direction_type", "check_in_at_raw", "check_out_at_raw", "check_in_at",
            "check_out_at", "payment_type", "use_voucher", "wallet_balance_before_raw",
            "wallet_balance_after_raw", "total_topup_raw", "bank_transfer_raw",
            "parking_fee_raw", "lost_card_fee_raw", "promotion_amount_raw",
            "promotion_vinfast_amount_raw", "amount_due_raw", "used_change_raw",
            "open_mode_in", "open_mode_out", "check_in_lane_image_id",
            "check_out_lane_image_id", "history_state", "description", "area_id",
            "computer_inid", "computer_outid", "haunt_id", "haunt_name", "vehicle_type",
            "park_duration_ms", "has_manual_edits", "service_category", "check_in_note",
            "check_out_note", "is_exception", "created_by_user_id", "created_by_username",
            "last_modified_by_user_id", "last_modified_by_username", "created_at",
            "last_modified_at", "face_id_in", "face_id_out", "feature_vector_in",
            "feature_vector_out", "checkin_customer_id", "checkout_customer_id",
            "event_date", "_dbt_loaded_at",
        ],
        "dim_asset_profile": [
            "asset_profile_sk", "asset_profile_id", "asset_profile_name",
            "asset_profile_description", "is_default", "tenant_id",
            "default_rule_chain_id", "default_dashboard_id", "default_queue_name",
            "default_edge_rule_chain_id", "image", "created_at", "_dbt_loaded_at",
        ],
        "dim_asset": [
            "asset_sk", "asset_id", "asset_name", "asset_label", "asset_type",
            "additional_info", "customer_id", "tenant_id", "external_id",
            "asset_profile_id", "asset_profile_name", "asset_profile_description",
            "asset_profile_is_default", "default_rule_chain_id", "default_dashboard_id",
            "default_queue_name", "default_edge_rule_chain_id", "created_at", "_dbt_loaded_at",
        ],
        "dim_date": [
            "date_key", "full_date", "year", "quarter", "month", "day", "year_month",
            "year_week", "day_of_year", "day_of_week", "day_name", "day_name_short",
            "is_weekend", "month_name", "month_name_short",
        ],
    }
    short = table.split(".")[-1]
    return mapping[short]


def main() -> None:
    print("Loading devices...")
    devices = load_devices()
    print(f"  {len(devices)} devices (1 per type)")
    master = build_master_data(devices)
    print(f"  {len(master['assets'])} assets, {len(master['asset_profiles'])} asset profiles")
    print("Generating mock data...")
    data = generate_all(devices, master)
    print("Writing schema...")
    write_schema()
    print("Writing mock SQL...")
    write_mock_data(data, devices)
    print("\nDone — 17 tables generated.")


if __name__ == "__main__":
    main()
