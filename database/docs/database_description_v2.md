# Database Description v2 — Dạng Cây (Data Lineage)

Cây đọc từ trên xuống: **gốc là bảng kết quả (DIM/FCT)**, nhánh con là các bảng nguồn tạo nên nó, lá là bảng RAW.

Ký hiệu: `📊 FCT/MART` | `📐 DIM` | `🔄 STG` | `📥 RAW`

---

## 🌳 Nhánh DMP Device & Profile

```
📐 dim_device
│   Dimension thiết bị đã enrich profile
│
├── 🔄 stg_dmp_devices
│   │   Staging chuẩn hóa device
│   │
│   └── 📥 raw_dmp_public_device
│           Raw device DMP (id, tên, label, type, firmware, profile)
│
└── 🔄 stg_dmp_device_profiles  ◄─── (dùng chung với dim_device_profile bên dưới)
    │   Staging chuẩn hóa device profile
    │
    └── 📥 raw_dmp_public_device_profile
            Raw device profile DMP
```

```
📐 dim_device_profile
│   Dimension device profile (transport, provision, firmware, rule chain...)
│
└── 🔄 stg_dmp_device_profiles  ◄─── (cùng staging với dim_device ở trên)
    │   Staging chuẩn hóa device profile
    │
    └── 📥 raw_dmp_public_device_profile
            Raw device profile DMP
```

---

## 🌳 Nhánh DMP Asset & Profile

```
📐 dim_asset
│   Dimension asset đã enrich profile
│
├── 🔄 stg_dmp_assets
│   │   Staging chuẩn hóa asset
│   │
│   └── 📥 raw_dmp_public_asset
│           Raw asset DMP (id, tên, label, type, tenant, profile)
│
└── 🔄 stg_dmp_asset_profiles  ◄─── (dùng chung với dim_asset_profile bên dưới)
    │   Staging chuẩn hóa asset profile
    │
    └── 📥 raw_dmp_public_asset_profile
            Raw asset profile DMP
```

```
📐 dim_asset_profile
│   Dimension asset profile (default flag, rule chain, dashboard, queue)
│
└── 🔄 stg_dmp_asset_profiles  ◄─── (cùng staging với dim_asset ở trên)
    │   Staging chuẩn hóa asset profile
    │
    └── 📥 raw_dmp_public_asset_profile
            Raw asset profile DMP
```

---

## 🌳 Nhánh DMP Device ↔ Asset (Bridge & Fact)

```
📐 dim_device_asset
│   Bridge hiện tại device ↔ asset (flatten device + asset + profile)
│
├── 📐 dim_device              (xem nhánh DMP Device)
├── 📐 dim_asset               (xem nhánh DMP Asset)
└── 🔄 stg_dmp_relations
    │   Staging quan hệ entity DMP (from_id, to_id, entity type, relation type)
    │
    └── 📥 raw_dmp_public_relation
            Raw quan hệ entity DMP
│
├── 📐 dim_device_asset_snapshot
│       Snapshot/SCD lịch sử quan hệ device-asset (valid_from/to, scd_id)
│       └── (nguồn: dim_device_asset — xem trên)
│
└── 📊 fct_device_asset_assignment
        Fact gán thiết bị vào asset (device/asset key, tenant, relation type, version)
        ├── 📐 dim_device      (xem nhánh DMP Device)
        ├── 📐 dim_asset       (xem nhánh DMP Asset)
        └── 🔄 stg_dmp_relations  (xem trên)
```

---

## 🌳 Nhánh DMP Connectivity & Events

```
📥 raw_dmp_evt_connectivity
│   Raw sự kiện connectivity/heartbeat (online/offline, quality score, lý do offline)
│
├── 🔄 stg_dmp_evt_connectivity
│       Staging connectivity event (device, tenant, trạng thái, timestamp)
│
└── 🔄 stg_dmp_device_status_events
        Staging sự kiện trạng thái thiết bị
        (current/previous status, online flag, date/hour)
```

---

## 🌳 Nhánh DMP Telemetry (Materialized Views)

```
📥 raw_dmp_tlm_raw
│   Raw telemetry (payload JSON, loại thiết bị, thời gian sự kiện)
│
├── 🔄 stg_mv_dmp_tlm_camera
│       MV telemetry camera (CPU, memory, fan, heater, reboot, uptime)
│
├── 🔄 stg_mv_dmp_tlm_chiller
│       MV telemetry chiller (trạng thái, fault, mode, valve limit)
│
├── 🔄 stg_mv_dmp_tlm_energy_meter
│       MV telemetry energy meter (dòng điện, điện năng, tần số, công suất, điện áp)
│
└── 🔄 stg_mv_dmp_tlm_nvr
        MV telemetry NVR (CPU, memory, uptime)
```

---

## 🌳 Nhánh Parking

```
📊 fct_parking_occupancy
│   Mart aggregate occupancy (số xe vào/ra, current occupancy theo bãi/giờ/ngày)
│
├── 📊 fct_vehicle_events
│   │   Fact từng lượt xe (check-in/out, bãi, loại xe, payment, phí, duration)
│   │
│   ├── 🔄 stg_vehicle_histories
│   │   │   Staging lịch sử xe (event id, biển số, bãi/cổng/làn, phí, trạng thái)
│   │   │
│   │   └── 📥 raw_parking_db_vehicle_histories
│   │           Raw lịch sử xe vào/ra (biển số, bãi, làn, thời gian, phí, thanh toán)
│   │
│   ├── 📐 dim_parking_lot ──────────────────────────────────────────────┐
│   │   │   Dimension bãi đỗ xe (mã bãi, tên bãi, khu vực)              │
│   │   │                                                                 │
│   │   ├── 🔄 stg_vehicle_histories  (xem trên)                         │
│   │   │                                                                 │
│   │   └── 📐 dim_parking_lot_snapshot                                  │
│   │           Snapshot/SCD lịch sử bãi đỗ (tên bãi/khu vực theo TG)   │
│   │                                                                     │
│   ├── 📐 dim_date   [generated]  ◄──────────────────────────────────── ┤
│   │       Dimension ngày (date_key, ngày/tháng/quý/năm, week)          │
│   │                                                                     │
│   └── 📐 dim_time   [generated]  ◄──────────────────────────────────── ┘
│           Dimension giờ (time_key, hour, minute, period)
│
├── 📐 dim_date        (xem trên)
├── 📐 dim_time        (xem trên)
└── 📐 dim_parking_lot (xem trên)
```

---

## 📋 Tóm tắt theo layer

| Layer | Bảng |
|---|---|
| **📊 FCT/MART** | `fct_device_asset_assignment`, `fct_vehicle_events`, `fct_parking_occupancy` |
| **📐 DIM** | `dim_asset`, `dim_asset_profile`, `dim_date`, `dim_device`, `dim_device_asset`, `dim_device_asset_snapshot`, `dim_device_profile`, `dim_parking_lot`, `dim_parking_lot_snapshot`, `dim_time` |
| **🔄 STG** | `stg_dmp_assets`, `stg_dmp_asset_profiles`, `stg_dmp_devices`, `stg_dmp_device_profiles`, `stg_dmp_device_status_events`, `stg_dmp_evt_connectivity`, `stg_dmp_relations`, `stg_vehicle_histories`, `stg_mv_dmp_tlm_camera`, `stg_mv_dmp_tlm_chiller`, `stg_mv_dmp_tlm_energy_meter`, `stg_mv_dmp_tlm_nvr` |
| **📥 RAW** | `raw_dmp_evt_connectivity`, `raw_dmp_tlm_raw`, `raw_dmp_public_asset`, `raw_dmp_public_asset_profile`, `raw_dmp_public_device`, `raw_dmp_public_device_profile`, `raw_dmp_public_relation`, `raw_parking_db_vehicle_histories` |
