# Domain: Device (Golden Layer)

Các bảng golden layer cho IoT device và quan hệ device–asset.  
**Bảng chính cho mọi query liên quan đến thiết bị.**

---

## Bảng trong domain

| Bảng | Mô tả ngắn | Khi nào dùng |
|---|---|---|
| `dim_device` | Golden dimension: một row = một device | Đếm, filter, thông tin thiết bị |
| `dim_device_profile` | Golden dimension: class thiết bị | Khi cần metadata profile không có trong `dim_device` |
| `dim_device_asset` | Bridge hiện tại: device đang gắn asset nào | Câu hỏi hiện tại |
| `dim_device_asset_snapshot` | SCD Type-2: lịch sử gán device–asset | Câu hỏi point-in-time |
| `fct_device_asset_assignment` | Event log quan hệ CONTAINS từ relation graph | Audit lineage, đếm assignments |

---

## Enum & Filter Values

### `dim_device`

| Cột | Giá trị / Pattern | Ghi chú |
|---|---|---|
| `device_type` | 35+ giá trị: `Hikvision Camera`, `Hikvision NVR`, `bms-chiller`, `bms-co2-sensor`, `siemens-chiller`, ... | Dùng LIKE khi filter theo nhóm |
| `transport_type` | `MQTT` | Hiện tại chỉ có MQTT |
| `provision_type` | `DISABLED` | Hiện tại chỉ có DISABLED |

Gợi ý filter `device_type` theo nhóm:
```sql
-- Camera
WHERE device_type LIKE '%Camera%'

-- Chiller (bao gồm bms-chiller, siemens-chiller, ...)
WHERE device_type LIKE '%chiller%' OR device_type LIKE '%Chiller%'

-- NVR
WHERE device_type LIKE '%NVR%'

-- Energy meter
WHERE device_type LIKE '%energy%' OR device_type LIKE '%Energy%' OR device_type LIKE '%meter%'
```

### `dim_device_asset_snapshot` (SCD Type-2)

| Cột | Filter active records |
|---|---|
| `dbt_valid_to` | `WHERE dbt_valid_to IS NULL` = bản ghi đang active hiện tại |

---

## Always-Apply Filters

| Filter | Áp dụng khi | Lý do |
|---|---|---|
| `WHERE dbt_valid_to IS NULL` | Query `dim_device_asset_snapshot` cho hiện tại | SCD Type-2 — row cũ vẫn tồn tại trong bảng |
| Dùng `dim_device_asset` thay vì `dim_device_asset_snapshot` | Câu hỏi về trạng thái hiện tại | `dim_device_asset` đã là current-state, không cần filter |

---

## Table Selection Guide

| Câu hỏi về... | Dùng bảng | KHÔNG dùng |
|---|---|---|
| Thông tin / đếm thiết bị | `dim_device` | `stg_dmp_devices` |
| Device profile metadata | `dim_device_profile` | — |
| Device đang gắn asset nào (hiện tại) | `dim_device_asset` | `fct_device_asset_assignment` |
| Device đã ở asset nào tại thời điểm X | `dim_device_asset_snapshot` + `WHERE dbt_valid_to IS NULL` | `dim_device_asset` |
| Audit lịch sử assignment | `fct_device_asset_assignment` | — |

---

## Join Paths

```
dim_device
  └─ → dim_device_profile        ON device_profile_id = device_profile_id

dim_device_asset  (denormalized — không cần join thêm)
  ├─ device_sk, device_id, device_name, device_type, ...
  └─ asset_sk, asset_id, asset_name, asset_type, ...

dim_device_asset_snapshot
  ├─ → dim_device    ON device_id = device_id
  └─ → dim_asset     ON asset_id  = asset_id

fct_device_asset_assignment
  ├─ → dim_device    ON device_sk = device_sk
  └─ → dim_asset     ON asset_sk  = asset_sk
```

---

## Query Patterns

### Đếm thiết bị theo loại
```sql
SELECT device_type, COUNT(*) AS total
FROM sdp_golden.dim_device
GROUP BY device_type
ORDER BY total DESC;
```

### Device đang gắn tại asset nào
```sql
SELECT device_name, device_type, asset_name, asset_type
FROM sdp_golden.dim_device_asset
WHERE device_name = 'BMS_CO2_SENSOR_01061';
```

### Danh sách device tại một tòa nhà
```sql
SELECT device_name, device_type
FROM sdp_golden.dim_device_asset
WHERE asset_name = 'BUILDING_001'
ORDER BY device_type, device_name;
```

### Số device theo loại asset
```sql
SELECT asset_type, COUNT(DISTINCT device_id) AS device_count
FROM sdp_golden.dim_device_asset
GROUP BY asset_type;
```

### Device X đã ở đâu vào ngày cụ thể (point-in-time)
```sql
SELECT device_name, asset_name, asset_type, dbt_valid_from, dbt_valid_to
FROM sdp_golden.dim_device_asset_snapshot
WHERE device_name = 'BMS_CO2_SENSOR_01061'
  AND dbt_valid_from <= '2026-01-15'
  AND (dbt_valid_to IS NULL OR dbt_valid_to > '2026-01-15');
```

---

## Instruction Coverage

| Instruction name | Trạng thái | Nội dung cần thêm |
|---|---|---|
| `device_type_values` | ⚠️ Sai | Sửa: `device_type` có 35+ giá trị, dùng LIKE để filter theo nhóm |
| `scd_active_filter` | ❌ Chưa có | `dim_device_asset_snapshot`: filter `dbt_valid_to IS NULL` để lấy record đang active |
| `device_asset_table_choice` | ❌ Chưa có | Hiện tại → `dim_device_asset`; point-in-time → `dim_device_asset_snapshot` |

---

## SQL Pair Coverage

| # | Câu hỏi mẫu | Trạng thái |
|---|---|---|
| SP-DEV-01 | Hệ thống có bao nhiêu camera? | ❌ Chưa có |
| SP-DEV-02 | Đếm tất cả thiết bị theo loại | ❌ Chưa có |
| SP-DEV-03 | Thiết bị nào đang được gắn tại tòa nhà X? | ❌ Chưa có |
| SP-DEV-04 | Device X đang ở vị trí nào hiện tại? | ❌ Chưa có |
| SP-DEV-05 | Số device theo loại asset (building/floor/zone)? | ❌ Chưa có |
