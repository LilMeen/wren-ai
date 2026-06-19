# Grouping Index — Domain Overview

Tài liệu phân nhóm theo domain để chuẩn bị **instructions** và **SQL pairs** cho Wren AI.  
Mỗi domain có file riêng: enum values, filters, join paths, query patterns, instruction/SQL pair checklist.

---

## 5 Domain Files

| Domain | File | Bảng chính | Số SQL pairs cần tạo |
|---|---|---|---|
| **DMP** (ThingsBoard staging) | [grouping_dmp.md](grouping_dmp.md) | `stg_dmp_device_status_events`, `stg_dmp_evt_connectivity` | 3 |
| **Device** (Golden layer) | [grouping_device.md](grouping_device.md) | `dim_device`, `dim_device_asset`, `dim_device_asset_snapshot` | 5 |
| **Asset** (Location hierarchy) | [grouping_asset.md](grouping_asset.md) | `dim_asset`, `dim_asset_profile` | 3 |
| **Telemetry** (IoT metrics) | [grouping_telemetry.md](grouping_telemetry.md) | `stg_mv_dmp_tlm_energy_meter`, `stg_mv_dmp_tlm_chiller`, camera, NVR | 5 |
| **Parking** (Vehicle & occupancy) | [grouping_parking.md](grouping_parking.md) | `fct_vehicle_events`, `fct_parking_occupancy`, `dim_parking_lot` | 10 |

**Tổng:** 26 SQL pairs cần tạo trong Wren UI.

---

## Cross-Domain Connections

### Sơ đồ kết nối tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│  ThingsBoard DMP                                                 │
│  stg_dmp_devices ──────────────────────────► dim_device         │
│  stg_dmp_device_profiles ──────────────────► dim_device_profile │
│  stg_dmp_assets ───────────────────────────► dim_asset          │
│  stg_dmp_asset_profiles ───────────────────► dim_asset_profile  │
│  stg_dmp_relations ────────────────────────► dim_device_asset   │
└──────────────────────────────────────┬──────────────────────────┘
                                       │ feeds golden layer
          ┌────────────────────────────▼────────────────────────────┐
          │  DEVICE domain              ASSET domain                 │
          │  dim_device ◄──────────────► dim_asset                  │
          │       │         dim_device_asset (bridge)                │
          │       │         dim_device_asset_snapshot (SCD)          │
          └───────┬─────────────────────────────────────────────────┘
                  │ deviceId → device_id
          ┌───────▼─────────────────────┐
          │  TELEMETRY domain           │
          │  stg_mv_dmp_tlm_camera      │
          │  stg_mv_dmp_tlm_chiller     │
          │  stg_mv_dmp_tlm_energy_meter│
          │  stg_mv_dmp_tlm_nvr         │
          └─────────────────────────────┘

          ┌─────────────────────────────┐
          │  PARKING domain             │  ← Độc lập, không join
          │  fct_vehicle_events         │     với Device/Asset/DMP
          │  fct_parking_occupancy      │
          │  dim_parking_lot            │
          └─────────────────────────────┘
          ┌─────────────────────────────┐
          │  SHARED (dùng nhiều domain) │
          │  dim_date                   │
          │  dim_time                   │
          └─────────────────────────────┘
```

### Chi tiết từng kết nối cross-domain

| Từ (domain) | Cột join | Tới (domain) | Cột join | Ghi chú |
|---|---|---|---|---|
| DMP → Device | `stg_dmp_device_status_events.device_id` | `dim_device.device_id` | UUID khớp |
| DMP → Device | `stg_dmp_evt_connectivity.deviceid` | `dim_device.device_id` | **lowercase** `deviceid` |
| Telemetry → Device | `stg_mv_dmp_tlm_*.deviceId` | `dim_device.device_id` | **camelCase** `deviceId` |
| Telemetry → Asset | (gián tiếp) qua `dim_device` → `dim_device_asset` | `dim_asset` | 2 bước join |
| Device → Asset | `dim_device_asset.asset_id` | `dim_asset.asset_id` | Bridge table |
| Parking → Shared | `fct_vehicle_events.check_in_date_key` | `dim_date.date_key` | YYYYMMDD integer |
| Parking → Shared | `fct_vehicle_events.check_in_time_key` | `dim_time.time_key` | HHMM string |
| Parking → Parking | `fct_vehicle_events.parking_lot_id` | `dim_parking_lot.pk_lot_id` | |
| Parking → Parking | `fct_parking_occupancy.parking_lot_id` | `dim_parking_lot.pk_lot_id` | |

### Kết nối KHÔNG tồn tại (gap đã biết)

| Gap | Hậu quả |
|---|---|
| Parking ↔ Device | Không thể query "camera tại bãi LOT_001" — parking và IoT là 2 hệ thống tách biệt |
| Parking ↔ Asset | `dim_parking_lot` không có `asset_id` → không thể join với `dim_asset` |
| Telemetry → Building trực tiếp | Phải đi qua `dim_device` → `dim_device_asset` (2 bước), filter `asset_type = 'building'` |
| `dim_parking_lot.total_capacity` | Không tồn tại → không thể tính utilization rate |

### Query cross-domain phổ biến

```sql
-- Telemetry → Device → Asset: tiêu thụ điện theo tòa nhà
SELECT da.asset_name,
       MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total) AS consumption_kwh
FROM sdp_golden.stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden.dim_device d        ON e.deviceId = d.device_id
JOIN sdp_golden.dim_device_asset da ON d.device_id = da.device_id
WHERE da.asset_type = 'building'
  AND e.tsDt BETWEEN '2026-06-01' AND '2026-06-30'
GROUP BY da.asset_name;

-- DMP → Device: device OFFLINE kèm thông tin chi tiết
SELECT s.device_code, s.current_status, s.event_time,
       d.device_type, d.device_profile_name
FROM sdp_golden.stg_dmp_device_status_events s
JOIN sdp_golden.dim_device d ON s.device_id = d.device_id
WHERE s.event_type = 'STATUS_CHANGE'
  AND s.current_status = 'OFFLINE';

-- Parking → Shared: doanh thu theo tháng, khu vực
SELECT d.year_month, l.area_id, SUM(e.amount_due) AS revenue
FROM sdp_golden.fct_vehicle_events e
JOIN sdp_golden.dim_date d         ON e.check_in_date_key = d.date_key
JOIN sdp_golden.dim_parking_lot l  ON e.parking_lot_id = l.pk_lot_id
WHERE e.history_state = 'COMPLETED'
GROUP BY d.year_month, l.area_id
ORDER BY d.year_month, revenue DESC;
```

---

## Instruction Coverage Summary

### Đã có (✅)
| Instruction | Domain |
|---|---|
| `starrocks_dialect` | Global |
| `schema_qualified_tables` | Global |
| `date_key_format` | Parking |
| `parking_occupancy` | Parking |
| `telemetry_tables` | Telemetry |

### Cần thêm / sửa (🔴 Cao)
| Instruction | Domain | Vấn đề |
|---|---|---|
| `device_type_values` | Device | ⚠️ Sai — thực tế có 35+ giá trị, dùng LIKE |
| `revenue_filter` | Parking | ❌ Thiếu — `history_state = 'COMPLETED'` |
| `dwell_time_formula` | Parking | ❌ Thiếu — `park_duration_ms / 60000` |
| `energy_meter_formula` | Telemetry | ❌ Thiếu — cumulative counter dùng MAX-MIN |
| `vehicle_payment_enums` | Parking | ❌ Thiếu — CAR/MOTORBIKE/TRUCK/EV, CASH/CARD/... |

### Cần thêm (🟡 Trung bình)
| Instruction | Domain |
|---|---|
| `telemetry_join_key` | Telemetry — `deviceId` camelCase |
| `scd_active_filter` | Device / Parking — `dbt_valid_to IS NULL` |
| `asset_type_casing` | Asset — lowercase vs Capitalized |
| `device_asset_table_choice` | Device — hiện tại vs point-in-time |
| `telemetry_time_filter` | Telemetry — dùng `tsDt` không dùng `ts` |

### Cần thêm (🟢 Thấp)
| Instruction | Domain |
|---|---|
| `parking_lot_structure` | Parking — 40 bãi, 20 khu vực |
| `parking_capacity_gap` | Parking — không có `total_capacity` |
| `asset_hierarchy` | Asset — Building → Floor → Zone → ... |

---

## SQL Pair Progress

| Domain | Tổng | Hoàn thành | Còn lại |
|---|---|---|---|
| DMP | 3 | 0 | 3 |
| Device | 5 | 0 | 5 |
| Asset | 3 | 0 | 3 |
| Telemetry | 5 | 0 | 5 |
| Parking | 10 | 0 | 10 |
| **Tổng** | **26** | **0** | **26** |

---

## Thứ tự triển khai

1. **Sửa `instructions.yml`** — 5 instruction 🔴 trước (impact cao nhất, effort thấp)
2. **SQL pairs Parking** — SP-PRK-01 đến SP-PRK-10 (domain business chính)
3. **SQL pairs Device** — SP-DEV-01 đến SP-DEV-05
4. **SQL pairs DMP + Telemetry** — SP-DMP-01–03, SP-TLM-01–05
5. **SQL pairs Asset** — SP-ASS-01–03
6. **Thêm instruction 🟡** — sau khi SQL pairs ổn định
