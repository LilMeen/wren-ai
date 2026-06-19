# Domain: Parking

Các bảng quản lý bãi đỗ xe: giao dịch xe vào/ra, occupancy theo giờ, thông tin bãi.  
**Domain độc lập nhất** — không phụ thuộc DMP hay IoT device.

---

## Bảng trong domain

| Bảng | Mô tả ngắn | Khi nào dùng |
|---|---|---|
| `fct_vehicle_events` | Golden fact: một row = một giao dịch vào/ra | Revenue, dwell time, lane, vehicle mix |
| `fct_parking_occupancy` | Pre-aggregated: occupancy theo giờ × bãi × loại xe | Occupancy, peak hour, lấp đầy |
| `dim_parking_lot` | Master bãi xe: 40 bãi, 20 khu vực | Danh sách bãi, group theo khu vực |
| `dim_parking_lot_snapshot` | SCD Type-2: lịch sử tên bãi/khu vực | Point-in-time query tên bãi |
| `stg_vehicle_histories` | Staging: raw từ hệ thống parking Couchbase | Debug ETL, cột không có trong fact |
| `dim_date` | Date dimension (shared) | Group/filter theo ngày/tuần/tháng |
| `dim_time` | Time dimension 15-phút (shared) | Group/filter theo giờ |

---

## Table Selection Guide

| Câu hỏi về... | Dùng bảng | KHÔNG dùng |
|---|---|---|
| Doanh thu (revenue, amount_due) | `fct_vehicle_events` | — |
| Số xe đang đỗ, giờ cao điểm | `fct_parking_occupancy` | `fct_vehicle_events` trực tiếp |
| Thời gian đỗ xe (dwell time) | `fct_vehicle_events` | — |
| Làn / cổng vào ra | `fct_vehicle_events` | — |
| Thông tin bãi xe, khu vực | `dim_parking_lot` | — |
| Lịch sử tên bãi (point-in-time) | `dim_parking_lot_snapshot` | `dim_parking_lot` |
| Debug ETL, cột lpn_camera_in/edited | `stg_vehicle_histories` | — |

---

## Enum & Filter Values

### `fct_vehicle_events`

| Cột | Giá trị hợp lệ | Ghi chú |
|---|---|---|
| `vehicle_type` | `CAR`, `MOTORBIKE`, `TRUCK`, `EV` | Case-sensitive UPPERCASE |
| `payment_type` | `CASH`, `CARD`, `E_WALLET`, `MONTHLY_PASS` | |
| `service_category` | `STANDARD`, `VIP`, `STAFF` | |
| `history_state` | `COMPLETED` | Chỉ có 1 giá trị trong data thực |
| `direction_type` | `IN_OUT` | Giao dịch hoàn chỉnh |
| `lpn_cmp` | `MATCH`, `MISMATCH` | |
| `open_mode_in` | `AUTO`, `MANUAL` | |
| `open_mode_out` | `AUTO`, `MANUAL` | |
| `service_id` | `SVC_01` – `SVC_05` | |
| `service_name` | `Hourly Parking`, `Monthly Parking`, `Visitor Parking` | |
| `entry_point_in_name` | `Gate In 1`, `Gate In 2`, `Gate In 3` | |
| `entry_point_out_name` | `Gate Out 1`, `Gate Out 2`, `Gate Out 3` | |
| `lane_in_name` | `Lane IN 1` – `Lane IN 6` | |
| `lane_out_name` | `Lane OUT 1` – `Lane OUT 6` | |

### `fct_parking_occupancy`

| Cột | Giá trị hợp lệ |
|---|---|
| `vehicle_type` | `CAR`, `MOTORBIKE`, `TRUCK`, `EV` |
| `parking_lot_id` | `LOT_001` – `LOT_040` |

### `dim_parking_lot`

| Cột | Giá trị hợp lệ |
|---|---|
| `pk_lot_id` | `LOT_001` – `LOT_040` (40 bãi) |
| `area_id` | `AREA_01` – `AREA_20` (20 khu vực) |

**Cấu trúc:** Mỗi khu vực chứa đúng 2 bãi xe.

### `dim_parking_lot_snapshot` (SCD Type-2)

| Filter | Ý nghĩa |
|---|---|
| `WHERE dbt_valid_to IS NULL` | Bản ghi đang active hiện tại |

---

## Always-Apply Filters

| # | Filter | Áp dụng khi | Lý do |
|---|---|---|---|
| F1 | `WHERE history_state = 'COMPLETED'` | Tính doanh thu, đếm giao dịch hợp lệ | Loại bỏ giao dịch lỗi/chưa hoàn thành |
| F2 | `WHERE check_out_at IS NOT NULL` | Tính dwell time | Xe chưa ra có `check_out_at = NULL` |
| F3 | Dùng `fct_parking_occupancy` thay vì tự tính | Occupancy, peak hour | Đã pre-aggregate, nhanh và chính xác hơn |
| F4 | `WHERE dbt_valid_to IS NULL` | Query `dim_parking_lot_snapshot` | SCD Type-2 |

---

## KPI Formulas

| KPI | Công thức | Cột dùng |
|---|---|---|
| Doanh thu | `SUM(amount_due)` WHERE `history_state = 'COMPLETED'` | `amount_due` (0–50,000 VND) |
| Dwell time (phút) | `AVG(park_duration_ms / 60000.0)` | `park_duration_ms` |
| Occupancy hiện tại | `SUM(current_occupancy)` tại `MAX(occupancy_hour)` | `fct_parking_occupancy.current_occupancy` |
| Tỉ lệ lấp đầy | `SUM(current_occupancy) / total_capacity * 100` | ⚠️ `total_capacity` chưa có trong data |

**Gap đã biết:** `dim_parking_lot` không có cột `total_capacity` → không thể tính utilization rate chính xác.

---

## Join Paths

```
fct_vehicle_events
  ├─ → dim_parking_lot     ON parking_lot_id = pk_lot_id
  ├─ → dim_date            ON check_in_date_key = date_key
  ├─ → dim_date            ON check_out_date_key = date_key
  ├─ → dim_time            ON check_in_time_key = time_key
  └─ → dim_time            ON check_out_time_key = time_key

fct_parking_occupancy
  ├─ → dim_parking_lot     ON parking_lot_id = pk_lot_id
  ├─ → dim_date            ON occupancy_date_key = date_key
  └─ → dim_time            ON occupancy_time_key = time_key
```

---

## Date/Time Filter Patterns

| Filter theo... | Cách viết |
|---|---|
| Hôm nay | `check_in_date_key = CAST(DATE_FORMAT(NOW(), '%Y%m%d') AS INT)` |
| Ngày cụ thể | `check_in_date_key = 20260601` |
| Khoảng ngày | `check_in_date_key BETWEEN 20260101 AND 20260131` |
| Tháng cụ thể | `JOIN dim_date ON date_key = check_in_date_key WHERE month = 6 AND year = 2026` |
| Năm cụ thể | `JOIN dim_date ... WHERE year = 2026` |
| Cuối tuần | `JOIN dim_date ... WHERE is_weekend = true` |
| Giờ cao điểm | `JOIN dim_time ON time_key = check_in_time_key WHERE hour BETWEEN 7 AND 9` |

---

## Query Patterns

### P1 — Doanh thu (Revenue)

```sql
-- Tổng doanh thu hôm nay
SELECT SUM(amount_due) AS revenue
FROM sdp_golden.fct_vehicle_events
WHERE history_state = 'COMPLETED'
  AND check_in_date_key = CAST(DATE_FORMAT(NOW(), '%Y%m%d') AS INT);

-- Doanh thu theo tháng
SELECT d.year_month, SUM(e.amount_due) AS revenue
FROM sdp_golden.fct_vehicle_events e
JOIN sdp_golden.dim_date d ON e.check_in_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
GROUP BY d.year_month
ORDER BY d.year_month;

-- Doanh thu theo bãi xe
SELECT parking_lot_id, SUM(amount_due) AS revenue, COUNT(*) AS transactions
FROM sdp_golden.fct_vehicle_events
WHERE history_state = 'COMPLETED'
GROUP BY parking_lot_id
ORDER BY revenue DESC;

-- Doanh thu theo khu vực
SELECT l.area_id, SUM(e.amount_due) AS revenue
FROM sdp_golden.fct_vehicle_events e
JOIN sdp_golden.dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
WHERE e.history_state = 'COMPLETED'
GROUP BY l.area_id
ORDER BY revenue DESC;

-- Doanh thu theo loại xe
SELECT vehicle_type, SUM(amount_due) AS revenue, COUNT(*) AS transactions
FROM sdp_golden.fct_vehicle_events
WHERE history_state = 'COMPLETED'
GROUP BY vehicle_type;

-- Doanh thu theo phương thức thanh toán
SELECT payment_type, SUM(amount_due) AS revenue,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS pct
FROM sdp_golden.fct_vehicle_events
WHERE history_state = 'COMPLETED'
GROUP BY payment_type;
```

### P2 — Occupancy

```sql
-- Số xe đang đỗ tại từng bãi (snapshot mới nhất)
SELECT parking_lot_id, SUM(current_occupancy) AS occupied
FROM sdp_golden.fct_parking_occupancy
WHERE occupancy_hour = (SELECT MAX(occupancy_hour) FROM sdp_golden.fct_parking_occupancy)
GROUP BY parking_lot_id
ORDER BY occupied DESC;

-- Occupancy theo khu vực (mới nhất)
SELECT l.area_id, SUM(o.current_occupancy) AS occupied
FROM sdp_golden.fct_parking_occupancy o
JOIN sdp_golden.dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
WHERE o.occupancy_hour = (SELECT MAX(occupancy_hour) FROM sdp_golden.fct_parking_occupancy)
GROUP BY l.area_id
ORDER BY occupied DESC;

-- Giờ cao điểm trong ngày
SELECT t.hour, SUM(o.current_occupancy) AS total_vehicles
FROM sdp_golden.fct_parking_occupancy o
JOIN sdp_golden.dim_time t ON o.occupancy_time_key = t.time_key
WHERE o.occupancy_date = DATE(NOW())
GROUP BY t.hour
ORDER BY total_vehicles DESC
LIMIT 5;
```

### P3 — Dwell Time

```sql
-- Thời gian đỗ trung bình theo loại xe
SELECT vehicle_type,
       ROUND(AVG(park_duration_ms / 60000.0), 1) AS avg_minutes
FROM sdp_golden.fct_vehicle_events
WHERE history_state = 'COMPLETED'
  AND check_out_at IS NOT NULL
GROUP BY vehicle_type;

-- Phân bố thời gian đỗ
SELECT CASE
         WHEN park_duration_ms / 60000 < 30  THEN 'Dưới 30 phút'
         WHEN park_duration_ms / 60000 < 60  THEN '30–60 phút'
         WHEN park_duration_ms / 60000 < 120 THEN '1–2 giờ'
         ELSE 'Trên 2 giờ'
       END AS bucket,
       COUNT(*) AS transactions
FROM sdp_golden.fct_vehicle_events
WHERE history_state = 'COMPLETED'
GROUP BY 1
ORDER BY MIN(park_duration_ms);
```

### P4 — Lane / Gate

```sql
-- Làn vào nào bận nhất
SELECT lane_in_name, COUNT(*) AS transactions
FROM sdp_golden.fct_vehicle_events
WHERE history_state = 'COMPLETED'
GROUP BY lane_in_name
ORDER BY transactions DESC;

-- Tỉ lệ AUTO vs MANUAL
SELECT open_mode_in, COUNT(*) AS cnt,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS pct
FROM sdp_golden.fct_vehicle_events
WHERE history_state = 'COMPLETED'
GROUP BY open_mode_in;
```

---

## Instruction Coverage

| Instruction name | Trạng thái | Nội dung cần thêm |
|---|---|---|
| `parking_occupancy` | ✅ Có rồi | Đã có — dùng `fct_parking_occupancy` |
| `date_key_format` | ✅ Có rồi | YYYYMMDD integer |
| `revenue_filter` | ❌ Chưa có | Luôn filter `history_state = 'COMPLETED'` khi tính doanh thu |
| `dwell_time_formula` | ❌ Chưa có | `park_duration_ms / 60000` = phút; không tính khi `check_out_at IS NULL` |
| `vehicle_payment_enums` | ❌ Chưa có | `vehicle_type`: CAR/MOTORBIKE/TRUCK/EV; `payment_type`: CASH/CARD/E_WALLET/MONTHLY_PASS |
| `parking_lot_structure` | ❌ Chưa có | 40 bãi LOT_001–LOT_040, 20 khu vực AREA_01–AREA_20, mỗi khu 2 bãi |
| `scd_parking_snapshot` | ❌ Chưa có | `dim_parking_lot_snapshot`: filter `dbt_valid_to IS NULL` cho active records |
| `parking_capacity_gap` | ❌ Chưa có | `dim_parking_lot` không có `total_capacity` — không thể tính utilization rate |

---

## SQL Pair Coverage

| # | Câu hỏi mẫu | Trạng thái |
|---|---|---|
| SP-PRK-01 | Tổng doanh thu hôm nay là bao nhiêu? | ❌ Chưa có |
| SP-PRK-02 | Doanh thu theo từng tháng trong năm 2026 | ❌ Chưa có |
| SP-PRK-03 | Bãi xe nào có doanh thu cao nhất? | ❌ Chưa có |
| SP-PRK-04 | So sánh doanh thu CAR vs MOTORBIKE | ❌ Chưa có |
| SP-PRK-05 | Tỉ lệ thanh toán tiền mặt vs thẻ vs ví điện tử? | ❌ Chưa có |
| SP-PRK-06 | Hiện có bao nhiêu xe đang đỗ tại từng bãi? | ❌ Chưa có |
| SP-PRK-07 | Giờ cao điểm đỗ xe trong ngày là mấy giờ? | ❌ Chưa có |
| SP-PRK-08 | Occupancy theo khu vực hiện tại? | ❌ Chưa có |
| SP-PRK-09 | Thời gian đỗ xe trung bình theo loại xe? | ❌ Chưa có |
| SP-PRK-10 | Làn vào nào bận nhất trong tuần này? | ❌ Chưa có |
