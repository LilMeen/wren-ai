# Domain: Telemetry

Các materialized view telemetry phân theo loại thiết bị — filter và parse từ `raw_dmp_tlm_raw`.  
**Đặc điểm riêng:** tên cột camelCase (`deviceId`, `eventTime`, `tsDt`) — khác với tất cả bảng còn lại.

---

## Bảng trong domain

| Bảng | Thiết bị | Metrics chính |
|---|---|---|
| `stg_mv_dmp_tlm_camera` | Camera | CPU usage, memory, fan state, heater state, reboot count, uptime |
| `stg_mv_dmp_tlm_chiller` | Chiller (HVAC) | chiller state, fault, mode, supply/return valve |
| `stg_mv_dmp_tlm_energy_meter` | Đồng hồ điện | energy (kWh), power (kW), current (A), voltage, power factor, water (m³) |
| `stg_mv_dmp_tlm_nvr` | NVR (Network Video Recorder) | CPU usage, memory, uptime |

---

## Cột chung tất cả telemetry tables

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `deviceId` | UUID | **camelCase** — join với `dim_device.device_id` |
| `ts` | bigint | Unix epoch milliseconds |
| `eventTime` | timestamp | Thời điểm event |
| `tenantId` | UUID | camelCase |
| `customerId` | UUID | camelCase |
| `tsDt` | timestamp | Datetime version của `ts` — dùng để filter theo thời gian |

---

## Enum & Filter Values

### `stg_mv_dmp_tlm_chiller`

| Cột | Giá trị | Ghi chú |
|---|---|---|
| `chiller_state` | `true` = đang chạy, `false` = dừng | |
| `fault` | `true` = đang có lỗi | Alert khi `fault = true` |
| `return_valve_open_limit` | `true`/`false` | |
| `supply_valve_open_limit` | `true`/`false` | |
| `supply_valve_close_limit` | `true`/`false` | |

### `stg_mv_dmp_tlm_camera`

| Cột | Range | Ghi chú |
|---|---|---|
| `cpu_usage_pct` | 0–100 | Alert khi > 80% |
| `memory_free_mb` | float | Alert khi thấp |
| `fan_state` | `true`/`false` | |
| `heater_state` | `true`/`false` | |

### `stg_mv_dmp_tlm_energy_meter`

| Cột | Ghi chú |
|---|---|
| `energy_active_kwh_total` | **Cumulative counter** — dùng `MAX - MIN` cho tiêu thụ kỳ |
| `power_active_kw` | Công suất tức thời — dùng trực tiếp |
| `water_volume_m3_total` | **Cumulative counter** — dùng `MAX - MIN` |

---

## Always-Apply Filters

| Filter | Áp dụng khi | Lý do |
|---|---|---|
| `MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total)` | Tính tiêu thụ điện kỳ | Counter tích lũy từ đầu, không phải delta |
| `MAX(water_volume_m3_total) - MIN(water_volume_m3_total)` | Tính tiêu thụ nước kỳ | Counter tích lũy |
| Dùng `tsDt` thay `ts` khi filter thời gian | Filter theo timestamp | `ts` là epoch ms — `tsDt` là datetime, dễ dùng hơn |

---

## Table Selection Guide

| Câu hỏi về... | Dùng bảng |
|---|---|
| Telemetry camera (CPU, memory, uptime) | `stg_mv_dmp_tlm_camera` |
| Chiller đang chạy / fault | `stg_mv_dmp_tlm_chiller` |
| Tiêu thụ điện, công suất, điện áp | `stg_mv_dmp_tlm_energy_meter` |
| NVR health (CPU, memory, uptime) | `stg_mv_dmp_tlm_nvr` |

---

## Join Paths

```
stg_mv_dmp_tlm_*  (tất cả)
  └─ → dim_device    ON deviceId = device_id   ← JOIN key là deviceId (camelCase)
```

**Lưu ý:** Join key là `deviceId` (camelCase), không phải `device_id`.  
Khi join với `dim_device_asset` để lấy thông tin asset, cần qua `dim_device` trước:
```
stg_mv_dmp_tlm_energy_meter
  → dim_device           ON deviceId = device_id
  → dim_device_asset     ON dim_device.device_id = dim_device_asset.device_id
  (filter asset_type = 'building' để lấy building-level)
```

---

## Query Patterns

### Tiêu thụ điện trong kỳ
```sql
SELECT deviceId,
       MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS consumption_kwh
FROM sdp_golden.stg_mv_dmp_tlm_energy_meter
WHERE tsDt BETWEEN '2026-06-01' AND '2026-06-30'
GROUP BY deviceId
ORDER BY consumption_kwh DESC;
```

### Công suất tức thời hiện tại
```sql
SELECT e.deviceId, d.device_name, e.power_active_kw
FROM sdp_golden.stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden.dim_device d ON e.deviceId = d.device_id
WHERE e.tsDt = (SELECT MAX(tsDt) FROM sdp_golden.stg_mv_dmp_tlm_energy_meter);
```

### Chiller nào đang fault
```sql
SELECT c.deviceId, d.device_name, c.eventTime
FROM sdp_golden.stg_mv_dmp_tlm_chiller c
JOIN sdp_golden.dim_device d ON c.deviceId = d.device_id
WHERE c.fault = true
  AND c.tsDt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY c.eventTime DESC;
```

### Camera CPU cao
```sql
SELECT c.deviceId, d.device_name, c.cpu_usage_pct, c.eventTime
FROM sdp_golden.stg_mv_dmp_tlm_camera c
JOIN sdp_golden.dim_device d ON c.deviceId = d.device_id
WHERE c.cpu_usage_pct > 80
ORDER BY c.cpu_usage_pct DESC;
```

### NVR uptime thấp nhất
```sql
SELECT c.deviceId, d.device_name, c.uptime_seconds / 3600.0 AS uptime_hours
FROM sdp_golden.stg_mv_dmp_tlm_nvr c
JOIN sdp_golden.dim_device d ON c.deviceId = d.device_id
WHERE c.tsDt = (SELECT MAX(tsDt) FROM sdp_golden.stg_mv_dmp_tlm_nvr)
ORDER BY uptime_seconds ASC
LIMIT 10;
```

---

## Known Data Gaps

| Gap | Mô tả | Ảnh hưởng |
|---|---|---|
| Không có direct join energy → building | `stg_mv_dmp_tlm_energy_meter` không có `asset_id` | Phải join qua `dim_device` → `dim_device_asset` rồi filter `asset_type = 'building'` |
| `water_volume_m3_total` không phải lúc nào cũng có | Chỉ có nếu đồng hồ nước được gắn kèm | Có thể NULL |

---

## Instruction Coverage

| Instruction name | Trạng thái | Nội dung cần thêm |
|---|---|---|
| `telemetry_tables` | ✅ Có rồi | Liệt kê 4 bảng telemetry |
| `telemetry_join_key` | ❌ Chưa có | Join key là `deviceId` (camelCase), không phải `device_id` |
| `energy_meter_formula` | ❌ Chưa có | `energy_active_kwh_total` là cumulative counter — dùng `MAX - MIN` cho kỳ |
| `telemetry_time_filter` | ❌ Chưa có | Dùng `tsDt` (datetime) thay vì `ts` (epoch ms) khi filter thời gian |

---

## SQL Pair Coverage

| # | Câu hỏi mẫu | Trạng thái |
|---|---|---|
| SP-TLM-01 | Tiêu thụ điện tháng này của từng đồng hồ? | ❌ Chưa có |
| SP-TLM-02 | Đồng hồ điện nào tiêu thụ nhiều nhất? | ❌ Chưa có |
| SP-TLM-03 | Chiller nào đang báo lỗi (fault)? | ❌ Chưa có |
| SP-TLM-04 | Camera nào có CPU usage cao nhất? | ❌ Chưa có |
| SP-TLM-05 | NVR nào có uptime thấp nhất hiện tại? | ❌ Chưa có |
