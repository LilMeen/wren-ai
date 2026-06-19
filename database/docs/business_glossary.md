# Business Glossary

Tài liệu này mô tả cách AI hiểu các thuật ngữ nghiệp vụ và ánh xạ chúng thành SQL query.  
Mỗi mục gồm: **thuật ngữ → AI hiểu như thế nào → SQL tương ứng**.

---

## 1. Parking Domain

### Doanh thu / Revenue / Tổng tiền thu được
- **AI hiểu:** Tổng `amount_due` của các giao dịch hợp lệ
- **Bảng:** `fct_vehicle_events`
- **Filter bắt buộc:** `WHERE history_state = 'COMPLETED'`
- **SQL mẫu:**
  ```sql
  SELECT SUM(amount_due) FROM sdp_golden.fct_vehicle_events
  WHERE history_state = 'COMPLETED'
  ```
- **Lưu ý:** KHÔNG dùng `parking_fee` (phí gốc trước giảm giá). LUÔN dùng `amount_due` (số thực trả).

---

### Thời gian đỗ / Dwell time / Thời gian đỗ xe
- **AI hiểu:** `park_duration_ms / 60000` = số phút đỗ xe
- **Bảng:** `fct_vehicle_events`
- **Filter bắt buộc:** `WHERE check_out_at IS NOT NULL` (loại xe chưa ra)
- **SQL mẫu:**
  ```sql
  SELECT AVG(park_duration_ms / 60000.0) AS avg_minutes
  FROM sdp_golden.fct_vehicle_events
  WHERE history_state = 'COMPLETED' AND check_out_at IS NOT NULL
  ```

---

### Số xe đang đỗ / Occupancy / Lấp đầy bãi
- **AI hiểu:** `current_occupancy` trong `fct_parking_occupancy` tại snapshot mới nhất
- **Bảng:** `fct_parking_occupancy` — KHÔNG tự tính từ `fct_vehicle_events`
- **SQL mẫu:**
  ```sql
  SELECT parking_lot_id, SUM(current_occupancy)
  FROM sdp_golden.fct_parking_occupancy
  WHERE occupancy_hour = (SELECT MAX(occupancy_hour) FROM sdp_golden.fct_parking_occupancy)
  GROUP BY parking_lot_id
  ```

---

### Giờ cao điểm / Peak hour / Giờ bận nhất
- **AI hiểu:** Giờ có `SUM(current_occupancy)` hoặc `SUM(vehicles_in)` cao nhất
- **Bảng:** `fct_parking_occupancy` JOIN `dim_time`
- **SQL mẫu:**
  ```sql
  SELECT t.hour, SUM(o.current_occupancy) AS vehicles
  FROM sdp_golden.fct_parking_occupancy o
  JOIN sdp_golden.dim_time t ON o.occupancy_time_key = t.time_key
  GROUP BY t.hour ORDER BY vehicles DESC LIMIT 5
  ```

---

### Tỉ lệ lấp đầy / Utilization rate
- **AI hiểu:** `current_occupancy / total_capacity * 100`
- **⚠ Gap:** `dim_parking_lot` chưa có cột `total_capacity` — **không thể tính chính xác**
- **Tạm thời:** Chỉ báo cáo `current_occupancy` tuyệt đối, không tính %

---

### Loại xe / Vehicle type
- **AI hiểu:** Cột `vehicle_type` với 4 giá trị UPPERCASE:
  - `CAR` — ô tô
  - `MOTORBIKE` — xe máy
  - `TRUCK` — xe tải
  - `EV` — xe điện

---

### Phương thức thanh toán / Payment method
- **AI hiểu:** Cột `payment_type`:
  - `CASH` — tiền mặt
  - `CARD` — thẻ ngân hàng
  - `E_WALLET` — ví điện tử (MoMo, ZaloPay, ...)
  - `MONTHLY_PASS` — vé tháng

---

### Tier dịch vụ / Service tier / Loại khách
- **AI hiểu:** Cột `service_category`:
  - `STANDARD` — khách thường
  - `VIP` — khách VIP
  - `STAFF` — nhân viên

---

### Bãi xe / Parking lot / Lô đỗ xe
- **AI hiểu:** `parking_lot_id` dạng `LOT_001` đến `LOT_040` (40 bãi)
- **Khu vực / Area:** `area_id` dạng `AREA_01` đến `AREA_20` (20 khu, mỗi khu 2 bãi)
- **Bảng master:** `dim_parking_lot`

---

### Cổng vào / Entry gate / Lane
- **AI hiểu:**
  - `entry_point_in_name`: `Gate In 1`, `Gate In 2`, `Gate In 3`
  - `lane_in_name`: `Lane IN 1` đến `Lane IN 6`
  - `open_mode_in`: `AUTO` hoặc `MANUAL`

---

## 2. Device Domain

### Thiết bị / Device
- **AI hiểu:** Mỗi row trong `dim_device` = một thiết bị IoT vật lý
- **Filter theo nhóm** (dùng LIKE vì có 35+ giá trị):
  - Camera: `device_type LIKE '%Camera%'`
  - Chiller: `device_type LIKE '%chiller%'`
  - NVR: `device_type LIKE '%NVR%'`
  - Energy meter: `device_type LIKE '%energy%' OR device_type LIKE '%meter%'`

---

### Thiết bị đang online / Device online status
- **AI hiểu:** Trạng thái cuối cùng trong `stg_dmp_device_status_events`
- **Cột:** `current_status` = `ONLINE` / `OFFLINE` / `MAINTENANCE`
- **Shortcut:** `is_online = true` thay vì `current_status = 'ONLINE'`
- **Filter:** `event_type = 'STATUS_CHANGE'` để loại heartbeat

---

### Uptime %
- **AI hiểu:** `100 * SUM(is_online) / COUNT(*)` trên `stg_dmp_device_status_events`
- **Filter:** `event_type = 'STATUS_CHANGE'`

---

### Thiết bị đang ở đâu / Device location / Device assignment
- **AI hiểu:** Join `dim_device_asset` — đã denormalize device + asset trong 1 bảng
- **Hiện tại:** `dim_device_asset` (current-state)
- **Lịch sử:** `dim_device_asset_snapshot` WHERE `dbt_valid_to IS NULL` = đang active

---

## 3. Asset Domain

### Asset / Vị trí / Cơ sở vật chất
- **AI hiểu:** Phân cấp vị trí vật lý: Building → Floor → Zone → Parking/Equipment
- **Cột `asset_type`** (lowercase): `building`, `floor`, `zone`, `parking`, `equipment`
- **Cột `asset_profile_name`** (Capitalized): `Building`, `Floor`, `Zone`, `Parking`, `Equipment`
- **Tên asset:** `BUILDING_001`, `FLOOR_002`, `ZONE_003`

---

## 4. Telemetry Domain

### Tiêu thụ điện / Energy consumption / kWh
- **AI hiểu:** `MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total)` trong kỳ
- **Lý do:** `energy_active_kwh_total` là **cumulative counter** từ đầu, không phải giá trị từng giờ
- **Bảng:** `stg_mv_dmp_tlm_energy_meter`
- **Join key:** `deviceId` (camelCase) → `dim_device.device_id`

---

### Công suất tức thời / Instant power / kW
- **AI hiểu:** `power_active_kw` — giá trị tức thời, đọc trực tiếp
- **Không dùng MAX-MIN** (đây không phải counter)

---

### Chiller đang chạy / Chiller running
- **AI hiểu:** `chiller_state = true`
- **Chiller lỗi / fault:** `fault = true`
- **Bảng:** `stg_mv_dmp_tlm_chiller`

---

### Camera health / NVR health
- **AI hiểu:** CPU usage (`cpu_usage_pct`), memory (`memory_free_mb`, `memory_used_mb`), uptime (`uptime_seconds`)
- **Bảng:** `stg_mv_dmp_tlm_camera`, `stg_mv_dmp_tlm_nvr`

---

## 5. Time & Date

### Hôm nay / Today
```sql
check_in_date_key = CAST(DATE_FORMAT(NOW(), '%Y%m%d') AS INT)
```

### Tháng này / This month
```sql
JOIN dim_date ON date_key = check_in_date_key
WHERE month = MONTH(NOW()) AND year = YEAR(NOW())
```

### Tuần này / This week
```sql
JOIN dim_date ON date_key = check_in_date_key
WHERE year_week = DATE_FORMAT(NOW(), '%Y-W%v')
```

### Cuối tuần / Weekend
```sql
JOIN dim_date ON date_key = check_in_date_key
WHERE is_weekend = true
```

### Khoảng ngày / Date range
```sql
check_in_date_key BETWEEN 20260601 AND 20260630
```

---

## 6. Disambiguation — Khi nào dùng bảng nào

| Câu hỏi | Bảng đúng | Bảng SAI |
|---|---|---|
| Bao nhiêu xe đang đỗ? | `fct_parking_occupancy` | `fct_vehicle_events` |
| Doanh thu / phí đỗ xe | `fct_vehicle_events` | `fct_parking_occupancy` |
| Thiết bị đang ở asset nào (hiện tại)? | `dim_device_asset` | `dim_device_asset_snapshot` |
| Thiết bị đã ở asset nào (lịch sử)? | `dim_device_asset_snapshot` | `dim_device_asset` |
| Thiết bị online/offline? | `stg_dmp_device_status_events` | `stg_dmp_evt_connectivity` |
| Thông tin thiết bị (đếm, filter) | `dim_device` | `stg_dmp_devices` |
| Tiêu thụ điện kỳ | `stg_mv_dmp_tlm_energy_meter` MAX-MIN | — |
| Thông tin bãi xe | `dim_parking_lot` | — |

---

## 7. Vietnamese ↔ English Mapping

| Tiếng Việt | English / Column |
|---|---|
| doanh thu, tiền thu, phí thu | revenue → `SUM(amount_due)` |
| xe đang đỗ, số xe hiện tại | occupancy → `current_occupancy` |
| thời gian đỗ, thời gian đậu xe | dwell time → `park_duration_ms / 60000` |
| giờ cao điểm, giờ bận nhất | peak hour → `occupancy_time_key` GROUP BY |
| bãi xe, lô đỗ | parking lot → `parking_lot_id` / `LOT_xxx` |
| khu vực | area → `area_id` / `AREA_xx` |
| tòa nhà | building → `asset_type = 'building'` |
| tầng | floor → `asset_type = 'floor'` |
| thiết bị, máy | device → `dim_device` |
| camera | camera → `device_type LIKE '%Camera%'` |
| chiller, máy lạnh | chiller → `device_type LIKE '%chiller%'` |
| đồng hồ điện | energy meter → `stg_mv_dmp_tlm_energy_meter` |
| tiêu thụ điện, điện năng | energy consumption → `MAX - MIN` of `energy_active_kwh_total` |
| trực tuyến, đang kết nối | online → `current_status = 'ONLINE'` hoặc `is_online = true` |
| offline, mất kết nối | offline → `current_status = 'OFFLINE'` |
| xe máy, mô tô | motorbike → `vehicle_type = 'MOTORBIKE'` |
| ô tô | car → `vehicle_type = 'CAR'` |
| xe điện | EV → `vehicle_type = 'EV'` |
| tiền mặt | cash → `payment_type = 'CASH'` |
| thẻ | card → `payment_type = 'CARD'` |
| ví điện tử | e-wallet → `payment_type = 'E_WALLET'` |
| vé tháng | monthly pass → `payment_type = 'MONTHLY_PASS'` |
| hôm nay | today → `date_key = CAST(DATE_FORMAT(NOW(), '%Y%m%d') AS INT)` |
| tháng này | this month → `month = MONTH(NOW()) AND year = YEAR(NOW())` |
| tuần này | this week → `year_week = DATE_FORMAT(NOW(), '%Y-W%v')` |
