# Business Summary — Wren AI Data Warehouse

Tổng hợp tất cả bảng, cột và SQL pair trong hệ thống Wren AI.
**Tổng SQL pairs: 86** (Parking: 26, Device: 13, DMP: 8, Telemetry: 34, Asset: 5)

---

## 1. Danh sách bảng và cột chính

### 1.1 GOLDEN DIMENSION — Asset / Location

| Bảng (schema alias) | Cột chính |
|---|---|
| `sdp_golden_dim_asset` | `asset_id`, `asset_name`, `asset_label`, `asset_type` (building/floor/zone/parking/equipment), `asset_profile_name`, `asset_profile_description` |
| `sdp_golden_dim_asset_profile` | `asset_profile_id`, `asset_profile_name`, `asset_profile_description` |

### 1.2 GOLDEN DIMENSION — Device

| Bảng (schema alias) | Cột chính |
|---|---|
| `sdp_golden_dim_device` | `device_id`, `device_name`, `device_label`, `device_type` (CAMERA/NVR/bms-co2-sensor/siemens-chiller…), `device_profile_name`, `created_at` |
| `sdp_golden_dim_device_profile` | `device_profile_id`, `device_profile_name`, `transport_type` |
| `sdp_golden_dim_device_asset` | `device_id`, `device_name`, `device_type`, `device_profile_name`, `asset_id`, `asset_name`, `asset_type`, `asset_profile_name` (denormalized bridge — current state) |
| `sdp_golden_dim_device_asset_snapshot` | same + `dbt_valid_from`, `dbt_valid_to` (SCD Type-2 — filter `dbt_valid_to IS NULL` for current) |

### 1.3 GOLDEN FACT — Device Assignment

| Bảng (schema alias) | Cột chính |
|---|---|
| `sdp_golden_fct_device_asset_assignment` | `device_id`, `asset_id`, `relation_type`, `device_tenant_id`, `asset_tenant_id` |

### 1.4 GOLDEN DIMENSION & FACT — Parking

| Bảng (schema alias) | Cột chính |
|---|---|
| `sdp_golden_dim_parking_lot` | `pk_lot_id` (LOT_001…LOT_040), `pk_lot_name`, `area_id` (AREA_01…AREA_20) |
| `sdp_golden_dim_date` | `date_key` (YYYYMMDD int), `full_date`, `year`, `month`, `year_month`, `year_week`, `day_name`, `is_weekend` |
| `sdp_golden_dim_time` | `time_key` (HHMM varchar), `hour`, `period` (night/morning/afternoon/evening), `time_label` |
| `sdp_golden_fct_vehicle_events` | `event_id`, `check_in_at`, `check_out_at`, `parking_lot_id`, `vehicle_type` (CAR/MOTORBIKE/TRUCK/EV), `payment_type` (CASH/CARD/E_WALLET/MONTHLY_PASS), `amount_due`, `park_duration_ms`, `lpn`, `history_state`, `lane_in_name`, `entry_point_in_name`, `lane_out_name`, `check_in_date_key`, `check_in_time_key`, `check_out_date_key`, `check_out_time_key` |
| `sdp_mart_fct_parking_occupancy` | `parking_lot_id`, `vehicle_type`, `occupancy_hour`, `occupancy_date_key`, `occupancy_time_key`, `vehicles_in`, `vehicles_out`, `current_occupancy` |

### 1.5 STAGING — Device Events

| Bảng (schema alias) | Cột chính |
|---|---|
| `sdp_staging_stg_dmp_device_status_events` | `event_id`, `device_id`, `event_type` (STATUS_CHANGE/STATUS_HEARTBEAT), `current_status` (ONLINE/OFFLINE/MAINTENANCE), `previous_status`, `is_online` (TINYINT), `event_time`, `event_date`, `device_type`, `device_code` |
| `sdp_staging_stg_dmp_evt_connectivity` | `deviceid`, `status` (ONLINE/OFFLINE), `offlinereason`, `qualityscore`, `icmpreachable`, `ts` — raw connectivity, dùng cho quality metrics, KHÔNG dùng cho online rate |

### 1.6 NEAR-REALTIME — Telemetry Materialized Views

| Bảng (schema alias) | Cột chính |
|---|---|
| `sdp_near_realtime_stg_mv_dmp_tlm_energy_meter` | `deviceId` (camelCase), `tsDt` (TIMESTAMP), `energy_active_kwh_total` (cumulative), `water_volume_m3_total` (cumulative), `power_active_kw`, `power_factor`, `current_a`, `voltage_l1_v`, `voltage_l2_v`, `voltage_l3_v`, `frequency_hz` |
| `sdp_near_realtime_stg_mv_dmp_tlm_camera` | `deviceId`, `tsDt`, `cpu_usage_pct`, `memory_used_mb`, `memory_free_mb`, `fan_state`, `heater_state`, `reboot_count_total`, `uptime_seconds` |
| `sdp_near_realtime_stg_mv_dmp_tlm_chiller` | `deviceId`, `tsDt`, `chiller_state` (1=running), `fault` (1=fault), `mode`, `return_valve_open_limit`, `supply_valve_open_limit`, `supply_valve_close_limit` |
| `sdp_near_realtime_stg_mv_dmp_tlm_nvr` | `deviceId`, `tsDt`, `cpu_usage_pct`, `memory_used_mb`, `memory_free_mb`, `uptime_seconds` |

> **Lưu ý join:** Tất cả telemetry dùng `deviceId` (camelCase) để join với `dim_device.device_id`

---

## 2. SQL Pairs theo Domain

### 2.1 Asset Domain (5 pairs)

| ID | Câu hỏi |
|---|---|
| SP-ASS-01 | Hệ thống có bao nhiêu tòa nhà? |
| SP-ASS-02 | Liệt kê các loại asset và số lượng trong hệ thống |
| SP-ASS-03 | Danh sách tất cả tòa nhà trong hệ thống? |
| SP-ASS-04 | Có bao nhiêu tòa nhà trong hệ thống? |
| SP-ASS-05 | Số lượng tòa nhà, tầng và zone trong hệ thống? |

**Bảng dùng:** `sdp_golden_dim_asset`
**Join key:** `asset_type` = 'building' / 'floor' / 'zone' / 'parking' / 'equipment'

---

### 2.2 Device Domain (13 pairs)

| ID | Câu hỏi |
|---|---|
| SP-DEV-01 | Hệ thống có bao nhiêu camera? |
| SP-DEV-02 | Đếm tất cả thiết bị theo loại |
| SP-DEV-03 | Thiết bị nào đang được gắn tại tòa nhà BUILDING_001? |
| SP-DEV-04 | Device X đang ở vị trí (asset) nào hiện tại? |
| SP-DEV-05 | Số thiết bị theo loại asset (building, floor, zone, parking, equipment)? |
| SP-DEV-06 | So sánh số lượng thiết bị theo từng loại (device_type)? |
| SP-DEV-08 | Thiết bị nào đang gắn tại vị trí (asset_name) cụ thể? |
| SP-DEV-09 | Vị trí (asset_name) nào có nhiều thiết bị nhất? |
| SP-DEV-10 | Camera nào đang đặt tại zone hoặc vị trí có tên chứa 'PARKING'? |
| SP-DEV-11 | Số lượng thiết bị theo từng loại (device_type) tại từng loại vị trí (asset_type)? |
| SP-DEV-12 | Danh sách tất cả vị trí (asset_name) và số thiết bị tại mỗi vị trí? |
| SP-DEV-13 | Danh sách các thang máy đang bảo trì hoặc hỏng? |

**Bảng dùng:** `sdp_golden_dim_device`, `sdp_golden_dim_device_asset`, `sdp_staging_stg_dmp_device_status_events`
**Join key:** `device_id` (dim_device) ↔ `device_id` (dim_device_asset) ↔ `device_id` (status_events)

---

### 2.3 DMP / Device Status Domain (8 pairs)

| ID | Câu hỏi |
|---|---|
| SP-DMP-01 | Thiết bị nào đang OFFLINE hiện tại? |
| SP-DMP-02 | Thiết bị nào mất kết nối nhiều lần nhất hôm nay? |
| SP-DMP-03 | Tỉ lệ online theo loại thiết bị? |
| SP-DMP-04 | Tỷ lệ thiết bị đang hoạt động (uptime) toàn hệ thống? |
| SP-DMP-05 | Tỷ lệ online của camera theo từng tòa nhà? |
| SP-DMP-06 | Thiết bị nào có số lần mất kết nối nhiều nhất trong 14 ngày qua? |
| SP-DMP-07 | Danh sách camera đang bị hỏng hoặc offline? |
| SP-DMP-08 | Tỉ lệ online của camera theo từng tòa nhà? |

**Bảng dùng:** `sdp_staging_stg_dmp_device_status_events`, `sdp_golden_dim_device`, `sdp_golden_dim_device_asset`
**Pattern chính:**
```sql
INNER JOIN (
  SELECT device_id, MAX(event_time) AS latest
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest_evt ON s.device_id = latest_evt.device_id AND s.event_time = latest_evt.latest
```
**Quy tắc:** LUÔN filter `event_type = 'STATUS_CHANGE'`, dùng `is_online` (TINYINT) thay `current_status = 'ONLINE'`

---

### 2.4 Telemetry Domain (34 pairs)

#### Energy Meter (SP-TLM-01 to -15, -26 to -34)

| ID | Câu hỏi |
|---|---|
| SP-TLM-01 | Tiêu thụ điện tháng này của từng đồng hồ điện? |
| SP-TLM-02 | Đồng hồ điện nào tiêu thụ nhiều nhất tháng này? |
| SP-TLM-06 | Tổng tiêu thụ điện toàn hệ thống tháng này? |
| SP-TLM-07 | Xu hướng tiêu thụ điện theo ngày trong tuần này? |
| SP-TLM-08 | So sánh tiêu thụ điện tháng này so với tháng trước? |
| SP-TLM-09 | Top 5 đồng hồ điện tiêu thụ nhiều nhất 30 ngày qua? |
| SP-TLM-10 | Công suất điện hiện tại (kW) của từng đồng hồ? |
| SP-TLM-11 | Tổng tiêu thụ nước toàn hệ thống tháng này? |
| SP-TLM-12 | Thiết bị nào tiêu thụ nước nhiều nhất tháng này? |
| SP-TLM-13 | So sánh tiêu thụ nước và điện theo thiết bị tháng này? |
| SP-TLM-14 | Xu hướng tiêu thụ nước theo ngày trong tháng này? |
| SP-TLM-15 | Tổng tiêu thụ điện và nước theo từng tháng trong năm nay? |
| SP-TLM-26 | Xu hướng tiêu thụ điện của đồng hồ điện trong 3 tháng gần nhất? |
| SP-TLM-27 | Top khu vực tiêu thụ điện nhiều nhất? |
| SP-TLM-28 | Tổng tiêu thụ điện toàn hệ thống tháng này? |
| SP-TLM-29 | Tiêu thụ điện của CHILLER trong 7 ngày qua? |
| SP-TLM-30 | Số liệu và xu hướng tiêu thụ điện tháng trước khu vực C? |
| SP-TLM-32 | Chiller nào đang tiêu thụ điện cao bất thường? |
| SP-TLM-33 | Xu hướng và số liệu tiêu thụ điện tháng trước khu vực C? |
| SP-TLM-34 | Xu hướng tiêu thụ điện khu vực B trong tuần qua? |

**Công thức tiêu thụ điện/nước (cumulative counter):**
```sql
MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS consumption_kwh
```

#### Chiller (SP-TLM-03, -16 to -18, -17)

| ID | Câu hỏi |
|---|---|
| SP-TLM-03 | Chiller nào đang báo lỗi (fault) trong 1 giờ gần nhất? |
| SP-TLM-16 | Bao nhiêu chiller đang chạy (chiller_state=1) hiện tại? |
| SP-TLM-17 | Chiller nào đang chạy nhưng đồng thời báo fault? |
| SP-TLM-18 | Chiller nào không gửi dữ liệu trong 3 giờ qua? |

#### Camera (SP-TLM-04, -19 to -25, -31)

| ID | Câu hỏi |
|---|---|
| SP-TLM-04 | Camera nào có CPU usage cao nhất hiện tại? |
| SP-TLM-19 | Camera nào không gửi dữ liệu trong 1 giờ qua? |
| SP-TLM-20 | Camera nào có CPU usage vượt 80% hiện tại? |
| SP-TLM-21 | Camera nào có CPU và RAM cao nhất hiện tại? |
| SP-TLM-22 | Camera nào không gửi dữ liệu trong 24 giờ qua (có thể offline)? |
| SP-TLM-23 | Top 5 camera có memory usage cao nhất hiện tại? |
| SP-TLM-24 | Bao nhiêu camera đang hoạt động (gửi dữ liệu trong 1 giờ qua)? |
| SP-TLM-25 | Xu hướng CPU và RAM trung bình của camera theo ngày tuần này? |
| SP-TLM-31 | Danh sách camera đang bị hỏng hoặc offline (không gửi dữ liệu trong 24 giờ)? |

#### NVR (SP-TLM-05)

| ID | Câu hỏi |
|---|---|
| SP-TLM-05 | NVR nào có uptime thấp nhất hiện tại? |

**Bảng dùng:** `sdp_near_realtime_stg_mv_dmp_tlm_energy_meter`, `sdp_near_realtime_stg_mv_dmp_tlm_camera`, `sdp_near_realtime_stg_mv_dmp_tlm_chiller`, `sdp_near_realtime_stg_mv_dmp_tlm_nvr`, `sdp_golden_dim_device`, `sdp_golden_dim_device_asset`

---

### 2.5 Parking Domain (26 pairs)

#### Revenue (SP-PRK-01 to -05, -11 to -19, -25)

| ID | Câu hỏi |
|---|---|
| SP-PRK-01 | Tổng doanh thu hôm nay là bao nhiêu? |
| SP-PRK-02 | Doanh thu theo từng tháng trong năm 2026 |
| SP-PRK-03 | Bãi xe nào có doanh thu cao nhất? |
| SP-PRK-04 | So sánh doanh thu theo loại xe CAR, MOTORBIKE, TRUCK, EV |
| SP-PRK-05 | Tỉ lệ phần trăm từng phương thức thanh toán? |
| SP-PRK-11 | So sánh doanh thu giữa các loại xe trong 30 ngày qua |
| SP-PRK-12 | Doanh thu 30 ngày qua theo loại xe là bao nhiêu? |
| SP-PRK-14 | So sánh doanh thu theo từng bãi xe tháng này? |
| SP-PRK-15 | Doanh thu theo từng bãi xe hôm nay? |
| SP-PRK-16 | Tỉ lệ phương thức thanh toán tại từng bãi xe tháng này? |
| SP-PRK-17 | Bãi xe nào có nhiều giao dịch vé tháng (MONTHLY_PASS) nhất? |
| SP-PRK-18 | Doanh thu theo phương thức thanh toán tại từng khu vực tháng này? |
| SP-PRK-19 | Xu hướng doanh thu theo phương thức thanh toán trong 3 tháng gần nhất? |
| SP-PRK-25 | Doanh thu cuối tuần cao hơn ngày thường bao nhiêu %? |

#### Occupancy (SP-PRK-06 to -08, -13)

| ID | Câu hỏi |
|---|---|
| SP-PRK-06 | Hiện có bao nhiêu xe đang đỗ tại từng bãi? |
| SP-PRK-07 | Giờ cao điểm đỗ xe trong ngày là mấy giờ? |
| SP-PRK-08 | Occupancy hiện tại theo từng khu vực (area)? |
| SP-PRK-13 | So sánh lượng xe đang đỗ theo từng khu vực? |

#### Vehicle Type / Dwell Time (SP-PRK-09, -20 to -24, -26)

| ID | Câu hỏi |
|---|---|
| SP-PRK-09 | Thời gian đỗ xe trung bình theo loại xe? |
| SP-PRK-20 | Phân bố loại xe tại từng bãi xe hôm nay? |
| SP-PRK-21 | Tỉ lệ từng loại xe trong tổng giao dịch tháng này? |
| SP-PRK-22 | Phí đỗ xe trung bình theo loại xe tháng này? |
| SP-PRK-23 | Xu hướng số lượng xe theo loại trong 3 tháng gần nhất? |
| SP-PRK-24 | Bãi xe nào có nhiều xe TRUCK nhất tháng này? |
| SP-PRK-26 | Bãi xe nào có nhiều lượt xe EV nhất? |

#### Lane / Entry (SP-PRK-10)

| ID | Câu hỏi |
|---|---|
| SP-PRK-10 | Làn vào nào bận nhất trong tuần này? |

**Bảng dùng:** `sdp_golden_fct_vehicle_events`, `sdp_golden_dim_parking_lot`, `sdp_golden_dim_date`, `sdp_mart_fct_parking_occupancy`, `sdp_golden_dim_time`
**Quy tắc:** Revenue → filter `history_state = 'COMPLETED'` + join `check_out_date_key`; Occupancy → dùng `fct_parking_occupancy`, KHÔNG tính từ `fct_vehicle_events`

---

## 3. Tổng hợp quan hệ giữa bảng

```
dim_device ──────────────────────── dim_device_asset ─── dim_asset
     │                                     │
     │ device_id                           │ device_id
     │                                     │
stg_dmp_device_status_events    stg_mv_dmp_tlm_*
     │                               (deviceId camelCase)
     │
     ▼
  is_online, current_status, event_type

fct_vehicle_events ─── dim_parking_lot ─── area_id
     │                      pk_lot_id
     │ check_out_date_key
     │
  dim_date (date_key)
     │ occupancy_date_key
     │
fct_parking_occupancy ─── dim_time (occupancy_time_key)
```

## 4. Critical Rules

| Rule | Detail |
|---|---|
| Energy consumption | `MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total)` — NEVER SUM/AVG |
| Telemetry join | `ON telemetry.deviceId = dim_device.device_id` (camelCase `deviceId`) |
| Device status | Filter `event_type = 'STATUS_CHANGE'`; use `is_online` not `current_status = 'ONLINE'` |
| Latest device record | `INNER JOIN (SELECT device_id, MAX(event_time) AS latest FROM ... GROUP BY device_id) latest_evt ON ...` |
| Revenue date | Join `check_out_date_key` → dim_date (not check_in_date_key) |
| Date key format | `CAST(DATE_FORMAT(NOW(), '%Y%m%d') AS INT)` — NEVER `CAST(... AS SIGNED)` |
| No window functions | DataFusion: no LAG/LEAD/DENSE_RANK/ROW_NUMBER |
| No DATE() function | Use `DATE_FORMAT(col, '%Y-%m-%d')` or `CAST(col AS DATE)` |
| YEARWEEK 1-arg only | `YEARWEEK(CAST(tsDt AS DATE))` — no 2-arg form |
| Parking capacity | dim_parking_lot has NO total_capacity — cannot compute fill rate % |
| CO2 data | stg_mv_dmp_tlm_co2_sensor does NOT exist |
| Camera quality cols | camera_quality_score, snr_db, brightness_avg do NOT exist |
