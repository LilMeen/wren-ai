"""
gen_mock.py
===========
Generate 1 month of hourly mock data for all devices from dmp_public_device.csv.
Time range: 2026-05-08 00:00 → 2026-06-08 23:00 (UTC+7 aware timestamps)
Granularity: 1 row per device per hour
Tables: raw_dmp_evt_connectivity, raw_dmp_tlm_raw
"""

import csv
import json
import random
import math
from datetime import datetime, timedelta, timezone

# ── Config ────────────────────────────────────────────────────────────────────
CSV_FILE       = "dmp_public_device.csv"
OUTPUT_FILE    = "mock_data.sql"
TENANT_ID      = "66f096d8-521b-4090-8052-c188b08821d5"
CUSTOMER_ID    = "56a0d760-490d-11f1-a19f-b52b73e46bf7"

# Start/end in local time (UTC+7), covering the full month ending today (2026-06-08)
START_DT = datetime(2026, 5, 8, 0, 0, 0)   # inclusive
END_DT   = datetime(2026, 6, 8, 23, 0, 0)  # inclusive

# UTC+7 offset → epoch = local_ts - 7*3600
UTC7_OFFSET_SECONDS = 7 * 3600

# Batch size for INSERT statements (rows per INSERT)
BATCH_SIZE = 500

# Seed for reproducibility
random.seed(42)

# ── Telemetry generators per device type ──────────────────────────────────────
def ts_to_epoch_ms(dt: datetime) -> int:
    """Convert naive local (UTC+7) datetime to epoch milliseconds."""
    return int((dt - datetime(1970, 1, 1)).total_seconds() * 1000) - UTC7_OFFSET_SECONDS * 1000

def sinusoidal(base, amp, hour, noise=0.05):
    """Smooth daily sinusoidal wave + small random noise."""
    wave = base + amp * math.sin(2 * math.pi * (hour - 6) / 24)
    return round(wave + random.gauss(0, base * noise), 2)

def make_telemetry(dtype: str, hour: int) -> dict:
    """Return a realistic telemetry dict depending on device type."""
    d = dtype.lower()

    if "co2" in d:
        # CO2 ppm: higher during work hours
        base = 450 if 8 <= hour <= 18 else 380
        return {"co2_ppm": sinusoidal(base, 80, hour, 0.03), "status": "ok"}

    if "air-flow" in d or "airflow" in d:
        # m³/h
        active = 8 <= hour <= 20
        flow = sinusoidal(1200, 400, hour, 0.04) if active else round(random.uniform(100, 200), 1)
        return {"flow_m3h": flow, "status": "ok"}

    if "btu" in d:
        # kWh
        return {"energy_kwh": round(random.uniform(0.5, 5.0) * (1.5 if 9 <= hour <= 17 else 0.8), 3), "status": "ok"}

    if "fan" in d or "pressurization" in d or "smoke" in d:
        running = hour in range(7, 22)
        return {"running": running, "speed_rpm": random.randint(800, 1500) if running else 0, "status": "ok"}

    if "water-pump" in d or "fire-pump" in d:
        return {"running": random.random() > 0.05, "pressure_bar": round(random.uniform(2.5, 4.5), 2), "status": "ok"}

    if "energy-water-meter" in d or "btu-meter" in d:
        return {"consumption_l": round(random.uniform(10, 80), 1), "status": "ok"}

    if "lighting" in d:
        on = 7 <= hour <= 22
        return {"on": on, "power_w": random.randint(800, 2400) if on else 0, "status": "ok"}

    if "smart-button" in d:
        return {"pressed": random.random() < 0.02, "battery_pct": random.randint(60, 100), "status": "ok"}

    if "camera" in d or "hikvision" in d or "hik-" in d or "nvr" in d or "anpr" in d:
        return {"recording": True, "fps": random.randint(24, 30), "disk_free_gb": round(random.uniform(50, 500), 1), "status": "ok"}

    if "parking" in d:
        return {"vehicles_in": random.randint(0, 5), "vehicles_out": random.randint(0, 5), "status": "ok"}

    if "lorawan" in d or "lora" in d:
        return {"rssi": random.randint(-120, -60), "snr": round(random.uniform(-5, 10), 1), "status": "ok"}

    if "chiller" in d:
        return {
            "supply_temp_c": round(random.uniform(6.5, 8.5), 2),
            "return_temp_c": round(random.uniform(11.5, 13.5), 2),
            "cop":           round(random.uniform(3.5, 5.5), 2),
            "status": "ok"
        }

    if "plc" in d or "siemens" in d or "ddc" in d:
        return {"cpu_load_pct": random.randint(10, 70), "alarms": random.randint(0, 2), "status": "ok"}

    if "gateway" in d:
        return {"connected_devices": random.randint(5, 50), "uptime_h": round(random.uniform(0, 720), 1), "status": "ok"}

    if "env-sensor" in d or "3in1" in d:
        return {
            "temp_c":    sinusoidal(24, 3, hour, 0.02),
            "humidity_pct": sinusoidal(55, 10, hour, 0.03),
            "co2_ppm":   sinusoidal(450, 80, hour, 0.03),
            "status": "ok"
        }

    if "water-tank" in d:
        return {"level_pct": round(random.uniform(30, 95), 1), "status": "ok"}

    if "cooling-tower" in d:
        return {"inlet_temp_c": round(random.uniform(28, 34), 2), "outlet_temp_c": round(random.uniform(24, 29), 2), "status": "ok"}

    if "acb" in d or "breaker" in d:
        return {"tripped": random.random() < 0.005, "current_a": round(random.uniform(10, 600), 1), "status": "ok"}

    if "fcu" in d or "fan-coil" in d:
        return {"setpoint_c": 22, "actual_c": round(random.uniform(21, 24), 1), "mode": "cool", "status": "ok"}

    if "pau" in d or "air-handler" in d:
        return {"supply_temp_c": round(random.uniform(15, 18), 2), "fan_speed_pct": random.randint(50, 100), "status": "ok"}

    if "face" in d or "fingerprint" in d:
        return {"scans_last_hour": random.randint(0, 30), "battery_pct": random.randint(50, 100), "status": "ok"}

    # default fallback
    return {"value": round(random.uniform(0, 100), 2), "status": "ok"}


def make_connectivity(device_id: str, dt: datetime, device_idx: int):
    """
    Simulate realistic connectivity:
    - 95 % ONLINE baseline
    - Brief disconnects (~3 %) more likely at night
    - Occasional low quality score
    """
    hour = dt.hour
    # Higher disconnect probability at night
    offline_prob = 0.08 if hour < 6 or hour >= 23 else 0.03
    # Stagger slightly per device so not all go offline at same time
    rng = random.Random(device_idx * 1000000 + int(dt.timestamp()))

    is_online = rng.random() > offline_prob
    status    = "ONLINE" if is_online else "OFFLINE"
    msg_type  = "CONNECT" if is_online else "DISCONNECT"
    quality   = rng.randint(75, 99) if is_online else rng.randint(0, 40)
    heartbeat = "NORMAL" if quality >= 80 else "WARNING"

    offline_reason = None if is_online else rng.choice([
        "NETWORK_TIMEOUT", "DEVICE_UNREACHABLE", "HEARTBEAT_MISSED"
    ])

    return {
        "msg_type":      msg_type,
        "status":        status,
        "quality_score": quality,
        "heartbeat":     heartbeat,
        "offline_reason": offline_reason,
    }


# ── Load devices (1 per type) ─────────────────────────────────────────────────
devices = []
seen_types = set()
with open(CSV_FILE, encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        dtype = row["type"]
        if dtype not in seen_types:
            seen_types.add(dtype)
            devices.append(row)

print(f"Loaded {len(devices)} devices from {CSV_FILE}")

# ── Build time slots ──────────────────────────────────────────────────────────
time_slots = []
cur = START_DT
while cur <= END_DT:
    time_slots.append(cur)
    cur += timedelta(hours=1)

print(f"Time range: {START_DT} → {END_DT}  |  {len(time_slots)} hourly slots")
print(f"Total rows per table: {len(devices) * len(time_slots):,}")

# ── Generate SQL ──────────────────────────────────────────────────────────────
def escape_sq(s):
    return s.replace("'", "''")

def write_batches(f, table, columns, rows):
    col_str = ", ".join(f"`{c}`" for c in columns)
    for i in range(0, len(rows), BATCH_SIZE):
        chunk = rows[i:i + BATCH_SIZE]
        f.write(f"INSERT INTO `{table}`\n({col_str})\nVALUES\n")
        f.write(",\n".join(chunk))
        f.write(";\n\n")

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    out.write("-- ==========================================\n")
    out.write("-- MOCK DATA FOR STARROCKS DATABASE\n")
    out.write(f"-- Period : {START_DT.date()} → {END_DT.date()}\n")
    out.write(f"-- Devices: {len(devices)} (1 per type)\n")
    out.write(f"-- Slots  : {len(time_slots)} (hourly)\n")
    out.write(f"-- Rows   : {len(devices)*len(time_slots):,} per table\n")
    out.write("-- ==========================================\n\n")

    conn_rows = []
    tlm_rows  = []

    for slot_idx, dt in enumerate(time_slots):
        ts_ms  = ts_to_epoch_ms(dt)
        ts_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        day_str = dt.strftime("%Y-%m-%d")

        for dev_idx, d in enumerate(devices):
            dev_id  = d["id"]
            dtype   = escape_sq(d["type"])
            hour    = dt.hour

            # ── connectivity row ──
            conn = make_connectivity(dev_id, dt, dev_idx)
            offline_val = f"'{escape_sq(conn['offline_reason'])}'" if conn["offline_reason"] else "NULL"
            conn_rows.append(
                f"('{dev_id}', '{TENANT_ID}', {ts_ms}, '{ts_str}', "
                f"'{conn['msg_type']}', '{CUSTOMER_ID}', '{conn['status']}', "
                f"{conn['quality_score']}, '{conn['heartbeat']}', {offline_val})"
            )

            # ── telemetry row ──
            rng_t = random.Random(dev_idx * 999983 + slot_idx * 31337)
            telemetry = make_telemetry(d["type"], hour)
            # inject a small "error" telemetry ~0.5 % of the time
            if rng_t.random() < 0.005:
                telemetry["status"] = "error"
                telemetry["error_code"] = rng_t.randint(100, 999)

            tlm_json = json.dumps(telemetry, ensure_ascii=False)
            tlm_rows.append(
                f"('{dev_id}', '{TENANT_ID}', {ts_ms}, '{ts_str}', "
                f"'mqtt', '{dtype}', '{escape_sq(tlm_json)}')"
            )

        if (slot_idx + 1) % 100 == 0:
            print(f"  processed {slot_idx+1}/{len(time_slots)} slots …")

    print(f"Writing {len(conn_rows):,} connectivity rows …")
    write_batches(
        out,
        "default_catalog.sdp_near_realtime.raw_dmp_evt_connectivity",
        ["deviceId", "tenantId", "ts", "tsDt", "msgType", "customerId", "status", "qualityScore", "heartbeatLevel", "offlineReason"],
        conn_rows,
    )

    print(f"Writing {len(tlm_rows):,} telemetry rows …")
    write_batches(
        out,
        "default_catalog.sdp_near_realtime.raw_dmp_tlm_raw",
        ["deviceId", "tenantId", "ts", "tsDt", "source", "deviceType", "telemetry"],
        tlm_rows,
    )

print(f"\nDone. Output: {OUTPUT_FILE}")
