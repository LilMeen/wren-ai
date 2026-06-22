# Question Testing — Wren AI (170 câu)

> **Test URL:** http://74.48.140.178:27668/home  
> **Tổng số câu:** 170  
> **Domains:** Parking · Device & Asset · Telemetry · DMP Status · ISO 37122 · Cross-domain · SQL Pairs Bổ Sung · AC.xlsx · Dashboard Drill-Down  
> **Format kết quả:** xem `logs.txt`

---

## Quy ước

| Trường | Mô tả |
|--------|--------|
| **Domain** | Nhóm chức năng |
| **ISO Ref** | Chỉ số ISO 37122 tương ứng (nếu có) |
| **Question** | Câu hỏi gõ vào UI |
| **Expected SQL** | SQL mong đợi Wren AI sinh ra (hoặc tương đương) |
| **Expected Result Type** | Dạng kết quả: Scalar / Table / Chart |

---

## DOMAIN 1 — PARKING (Q001–Q025)

---

### Q001
- **Domain:** Parking
- **Question:** Tổng doanh thu parking hôm nay là bao nhiêu?
- **Expected SQL:**
```sql
SELECT SUM(amount_due) AS revenue_vnd
FROM sdp_golden_fct_vehicle_events
WHERE history_state = 'COMPLETED'
  AND check_out_date_key = CAST(DATE_FORMAT(NOW(), '%Y%m%d') AS INT)
```
- **Expected Result Type:** Scalar

---

### Q002
- **Domain:** Parking
- **Question:** Doanh thu theo từng tháng trong năm 2026?
- **Expected SQL:**
```sql
SELECT d.year_month,
       SUM(e.amount_due) AS revenue_vnd,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND d.year = 2026
GROUP BY d.year_month
ORDER BY d.year_month
```
- **Expected Result Type:** Table / Line Chart

---

### Q003
- **Domain:** Parking
- **Question:** Bãi xe nào có doanh thu cao nhất?
- **Expected SQL:**
```sql
SELECT e.parking_lot_id,
       l.pk_lot_name,
       l.area_id,
       SUM(e.amount_due) AS revenue_vnd,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
WHERE e.history_state = 'COMPLETED'
GROUP BY e.parking_lot_id, l.pk_lot_name, l.area_id
ORDER BY revenue_vnd DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q004
- **Domain:** Parking
- **Question:** Tỷ lệ phần trăm từng phương thức thanh toán trong 30 ngày qua?
- **Expected SQL:**
```sql
SELECT payment_type,
       COUNT(*) AS transactions,
       ROUND(100.0 * COUNT(*) / t.total, 2) AS pct,
       SUM(amount_due) AS revenue_vnd
FROM sdp_golden_fct_vehicle_events
CROSS JOIN (
  SELECT COUNT(*) AS total
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y%m%d') AS INT)
) t
WHERE history_state = 'COMPLETED'
  AND check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y%m%d') AS INT)
GROUP BY payment_type, t.total
ORDER BY transactions DESC
```
- **Expected Result Type:** Table / Pie Chart

---

### Q005
- **Domain:** Parking
- **Question:** Hiện có bao nhiêu xe đang đỗ tại từng bãi?
- **Expected SQL:**
```sql
SELECT o.parking_lot_id,
       l.pk_lot_name,
       l.area_id,
       SUM(o.current_occupancy) AS vehicles_parked
FROM sdp_mart_fct_parking_occupancy o
JOIN sdp_golden_dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
WHERE o.occupancy_hour = (
  SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy
)
GROUP BY o.parking_lot_id, l.pk_lot_name, l.area_id
ORDER BY vehicles_parked DESC
```
- **Expected Result Type:** Table

---

### Q006
- **Domain:** Parking
- **Question:** Giờ cao điểm đỗ xe trong ngày là mấy giờ?
- **Expected SQL:**
```sql
SELECT t.hour,
       t.hour_label,
       SUM(o.current_occupancy) AS total_vehicles
FROM sdp_mart_fct_parking_occupancy o
JOIN sdp_golden_dim_time t ON o.occupancy_time_key = t.time_key
WHERE o.occupancy_date = DATE_FORMAT(NOW(), '%Y-%m-%d')
GROUP BY t.hour, t.hour_label
ORDER BY total_vehicles DESC
LIMIT 5
```
- **Expected Result Type:** Table / Bar Chart

---

### Q007
- **Domain:** Parking
- **Question:** Occupancy hiện tại theo từng khu vực (area)?
- **Expected SQL:**
```sql
SELECT l.area_id,
       SUM(o.current_occupancy) AS vehicles_parked
FROM sdp_mart_fct_parking_occupancy o
JOIN sdp_golden_dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
WHERE o.occupancy_hour = (
  SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy
)
GROUP BY l.area_id
ORDER BY vehicles_parked DESC
```
- **Expected Result Type:** Table

---

### Q008
- **Domain:** Parking
- **Question:** Thời gian đỗ xe trung bình theo loại xe trong tháng này?
- **Expected SQL:**
```sql
SELECT e.vehicle_type,
       ROUND(AVG(e.park_duration_ms / 60000.0), 1) AS avg_minutes,
       ROUND(MIN(e.park_duration_ms / 60000.0), 1) AS min_minutes,
       ROUND(MAX(e.park_duration_ms / 60000.0), 1) AS max_minutes,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_at IS NOT NULL
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY e.vehicle_type
ORDER BY avg_minutes DESC
```
- **Expected Result Type:** Table

---

### Q009
- **Domain:** Parking
- **Question:** Số lượt xe vào tuần này?
- **Expected SQL:**
```sql
SELECT COUNT(*) AS vehicle_entries
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_date d ON e.check_in_date_key = d.date_key
WHERE YEARWEEK(d.full_date) = YEARWEEK(CURRENT_DATE)
```
- **Expected Result Type:** Scalar

---

### Q010
- **Domain:** Parking
- **Question:** Doanh thu tháng trước là bao nhiêu?
- **Expected SQL:**
```sql
SELECT SUM(e.amount_due) AS revenue_vnd,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y%m01') AS INT)
  AND e.check_out_date_key < CAST(DATE_FORMAT(NOW(), '%Y%m01') AS INT)
```
- **Expected Result Type:** Scalar

---

### Q011
- **Domain:** Parking
- **Question:** Làn vào nào bận nhất trong tuần này?
- **Expected SQL:**
```sql
SELECT e.lane_in_name,
       e.entry_point_in_name,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_date d ON e.check_in_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND d.year_week = DATE_FORMAT(NOW(), '%Y-W%v')
GROUP BY e.lane_in_name, e.entry_point_in_name
ORDER BY transactions DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q012
- **Domain:** Parking
- **Question:** So sánh doanh thu giữa các loại xe trong 30 ngày qua?
- **Expected SQL:**
```sql
SELECT e.vehicle_type,
       SUM(e.amount_due) AS revenue_vnd,
       COUNT(*) AS transactions,
       ROUND(AVG(e.amount_due), 0) AS avg_fee_vnd,
       ROUND(100.0 * SUM(e.amount_due) / t.total_revenue, 2) AS revenue_pct
FROM sdp_golden_fct_vehicle_events e
CROSS JOIN (
  SELECT SUM(amount_due) AS total_revenue
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y%m%d') AS INT)
) t
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y%m%d') AS INT)
GROUP BY e.vehicle_type, t.total_revenue
ORDER BY revenue_vnd DESC
```
- **Expected Result Type:** Table / Bar Chart

---

### Q013
- **Domain:** Parking
- **Question:** Doanh thu theo từng bãi xe hôm nay?
- **Expected SQL:**
```sql
SELECT e.parking_lot_id,
       l.pk_lot_name,
       l.area_id,
       SUM(e.amount_due) AS revenue_vnd,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_date_key = CAST(DATE_FORMAT(NOW(), '%Y%m%d') AS INT)
GROUP BY e.parking_lot_id, l.pk_lot_name, l.area_id
ORDER BY revenue_vnd DESC
```
- **Expected Result Type:** Table

---

### Q014
- **Domain:** Parking
- **Question:** Tỉ lệ phương thức thanh toán tại từng bãi xe tháng này?
- **Expected SQL:**
```sql
SELECT e.parking_lot_id,
       l.pk_lot_name,
       e.payment_type,
       COUNT(*) AS transactions,
       SUM(e.amount_due) AS revenue_vnd
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY e.parking_lot_id, l.pk_lot_name, e.payment_type
ORDER BY e.parking_lot_id, transactions DESC
```
- **Expected Result Type:** Table

---

### Q015
- **Domain:** Parking
- **Question:** Bãi xe nào có nhiều giao dịch vé tháng (MONTHLY_PASS) nhất?
- **Expected SQL:**
```sql
SELECT e.parking_lot_id,
       l.pk_lot_name,
       l.area_id,
       COUNT(*) AS monthly_pass_count,
       SUM(e.amount_due) AS revenue_vnd
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND e.payment_type = 'MONTHLY_PASS'
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY e.parking_lot_id, l.pk_lot_name, l.area_id
ORDER BY monthly_pass_count DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q016
- **Domain:** Parking
- **Question:** Doanh thu theo phương thức thanh toán tại từng khu vực tháng này?
- **Expected SQL:**
```sql
SELECT l.area_id,
       e.payment_type,
       SUM(e.amount_due) AS revenue_vnd,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY l.area_id, e.payment_type
ORDER BY l.area_id, revenue_vnd DESC
```
- **Expected Result Type:** Table

---

### Q017
- **Domain:** Parking
- **Question:** So sánh lượng xe đang đỗ theo từng khu vực?
- **Expected SQL:**
```sql
SELECT l.area_id,
       SUM(o.current_occupancy) AS vehicles_parked,
       ROUND(100.0 * SUM(o.current_occupancy) / t.total, 2) AS pct
FROM sdp_mart_fct_parking_occupancy o
JOIN sdp_golden_dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
CROSS JOIN (
  SELECT SUM(o2.current_occupancy) AS total
  FROM sdp_mart_fct_parking_occupancy o2
  WHERE o2.occupancy_hour = (SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy)
) t
WHERE o.occupancy_hour = (SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy)
GROUP BY l.area_id, t.total
ORDER BY vehicles_parked DESC
```
- **Expected Result Type:** Table

---

### Q018
- **Domain:** Parking
- **Question:** Phí đỗ xe trung bình theo loại xe tháng này?
- **Expected SQL:**
```sql
SELECT e.vehicle_type,
       ROUND(AVG(e.amount_due), 0) AS avg_fee_vnd,
       ROUND(MIN(e.amount_due), 0) AS min_fee_vnd,
       ROUND(MAX(e.amount_due), 0) AS max_fee_vnd,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY e.vehicle_type
ORDER BY avg_fee_vnd DESC
```
- **Expected Result Type:** Table

---

### Q019
- **Domain:** Parking
- **Question:** Top 5 bãi xe có doanh thu cao nhất tháng này?
- **Expected SQL:**
```sql
SELECT l.pk_lot_name,
       l.area_id,
       SUM(e.amount_due) AS revenue_vnd,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY l.pk_lot_name, l.area_id
ORDER BY revenue_vnd DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q020
- **Domain:** Parking
- **Question:** So sánh doanh thu theo từng bãi xe tháng này?
- **Expected SQL:**
```sql
SELECT l.pk_lot_name,
       l.area_id,
       SUM(e.amount_due) AS revenue_vnd,
       COUNT(*) AS transactions,
       ROUND(100.0 * SUM(e.amount_due) / t.total, 2) AS revenue_pct
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
CROSS JOIN (
  SELECT SUM(e2.amount_due) AS total
  FROM sdp_golden_fct_vehicle_events e2
  JOIN sdp_golden_dim_date d2 ON e2.check_out_date_key = d2.date_key
  WHERE e2.history_state = 'COMPLETED'
    AND d2.year = YEAR(NOW()) AND d2.month = MONTH(NOW())
) t
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY l.pk_lot_name, l.area_id, t.total
ORDER BY revenue_vnd DESC
```
- **Expected Result Type:** Table

---

### Q021
- **Domain:** Parking
- **Question:** Xu hướng doanh thu theo phương thức thanh toán trong 3 tháng gần nhất?
- **Expected SQL:**
```sql
SELECT d.year_month,
       e.payment_type,
       SUM(e.amount_due) AS revenue_vnd,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 3 MONTH), '%Y%m%d') AS INT)
GROUP BY d.year_month, e.payment_type
ORDER BY d.year_month, revenue_vnd DESC
```
- **Expected Result Type:** Table / Line Chart

---

### Q022
- **Domain:** Parking
- **Question:** Phân bố loại xe tại từng bãi xe hôm nay?
- **Expected SQL:**
```sql
SELECT e.parking_lot_id,
       l.pk_lot_name,
       e.vehicle_type,
       COUNT(*) AS transactions,
       SUM(e.amount_due) AS revenue_vnd
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_date_key = CAST(DATE_FORMAT(NOW(), '%Y%m%d') AS INT)
GROUP BY e.parking_lot_id, l.pk_lot_name, e.vehicle_type
ORDER BY e.parking_lot_id, transactions DESC
```
- **Expected Result Type:** Table

---

### Q023
- **Domain:** Parking
- **Question:** Xu hướng số lượng xe theo loại trong 3 tháng gần nhất?
- **Expected SQL:**
```sql
SELECT d.year_month,
       e.vehicle_type,
       COUNT(*) AS transactions,
       SUM(e.amount_due) AS revenue_vnd
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 3 MONTH), '%Y%m%d') AS INT)
GROUP BY d.year_month, e.vehicle_type
ORDER BY d.year_month, transactions DESC
```
- **Expected Result Type:** Table / Line Chart

---

### Q024
- **Domain:** Parking
- **Question:** Bãi xe nào có nhiều xe TRUCK nhất tháng này?
- **Expected SQL:**
```sql
SELECT e.parking_lot_id,
       l.pk_lot_name,
       l.area_id,
       COUNT(*) AS truck_count,
       SUM(e.amount_due) AS revenue_vnd
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND e.vehicle_type = 'TRUCK'
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY e.parking_lot_id, l.pk_lot_name, l.area_id
ORDER BY truck_count DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q025
- **Domain:** Parking
- **Question:** Doanh thu cuối tuần cao hơn ngày thường bao nhiêu %?
- **Expected SQL:**
```sql
SELECT wknd.avg_vnd AS avg_weekend_vnd,
       wkdy.avg_vnd AS avg_weekday_vnd,
       ROUND((wknd.avg_vnd - wkdy.avg_vnd) / wkdy.avg_vnd * 100, 2) AS pct_diff
FROM (
  SELECT ROUND(AVG(daily_rev), 0) AS avg_vnd
  FROM (
    SELECT e.check_out_date_key, SUM(e.amount_due) AS daily_rev
    FROM sdp_golden_fct_vehicle_events e
    JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
    WHERE e.history_state = 'COMPLETED'
      AND e.check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y%m%d') AS INT)
      AND DAYOFWEEK(d.full_date) IN (1, 7)
    GROUP BY e.check_out_date_key
  ) sub
) wknd,
(
  SELECT ROUND(AVG(daily_rev), 0) AS avg_vnd
  FROM (
    SELECT e.check_out_date_key, SUM(e.amount_due) AS daily_rev
    FROM sdp_golden_fct_vehicle_events e
    JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
    WHERE e.history_state = 'COMPLETED'
      AND e.check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y%m%d') AS INT)
      AND DAYOFWEEK(d.full_date) NOT IN (1, 7)
    GROUP BY e.check_out_date_key
  ) sub
) wkdy
```
- **Expected Result Type:** Scalar

---

## DOMAIN 2 — DEVICE & ASSET (Q026–Q040)

---

### Q026
- **Domain:** Device & Asset
- **Question:** Hệ thống có bao nhiêu tòa nhà?
- **Expected SQL:**
```sql
SELECT COUNT(*) AS building_count
FROM sdp_golden_dim_asset
WHERE asset_type = 'building'
```
- **Expected Result Type:** Scalar

---

### Q027
- **Domain:** Device & Asset
- **Question:** Số lượng từng loại asset trong hệ thống (building, floor, zone, parking, equipment)?
- **Expected SQL:**
```sql
SELECT asset_type,
       COUNT(*) AS total
FROM sdp_golden_dim_asset
WHERE asset_type IN ('building', 'floor', 'zone', 'parking', 'equipment')
GROUP BY asset_type
ORDER BY FIELD(asset_type, 'building', 'floor', 'zone', 'parking', 'equipment')
```
- **Expected Result Type:** Table

---

### Q028
- **Domain:** Device & Asset
- **Question:** Danh sách tất cả tòa nhà trong hệ thống?
- **Expected SQL:**
```sql
SELECT asset_name,
       asset_label,
       asset_profile_name
FROM sdp_golden_dim_asset
WHERE asset_type = 'building'
ORDER BY asset_name
```
- **Expected Result Type:** Table

---

### Q029
- **Domain:** Device & Asset
- **Question:** Hệ thống có bao nhiêu camera?
- **Expected SQL:**
```sql
SELECT COUNT(*) AS camera_count
FROM sdp_golden_dim_device
WHERE device_type LIKE '%Camera%'
```
- **Expected Result Type:** Scalar

---

### Q030
- **Domain:** Device & Asset
- **Question:** Đếm tất cả thiết bị theo loại?
- **Expected SQL:**
```sql
SELECT device_type,
       COUNT(*) AS total
FROM sdp_golden_dim_device
GROUP BY device_type
ORDER BY total DESC
```
- **Expected Result Type:** Table

---

### Q031
- **Domain:** Device & Asset
- **Question:** Thiết bị nào đang được gắn tại tòa nhà BUILDING_001?
- **Expected SQL:**
```sql
SELECT device_name,
       device_type,
       asset_name,
       asset_type
FROM sdp_golden_dim_device_asset
WHERE asset_name = 'BUILDING_001'
ORDER BY device_type, device_name
```
- **Expected Result Type:** Table

---

### Q032
- **Domain:** Device & Asset
- **Question:** Số thiết bị theo loại asset (building, floor, zone, parking, equipment)?
- **Expected SQL:**
```sql
SELECT asset_type,
       COUNT(DISTINCT device_id) AS device_count
FROM sdp_golden_dim_device_asset
GROUP BY asset_type
ORDER BY device_count DESC
```
- **Expected Result Type:** Table

---

### Q033
- **Domain:** Device & Asset
- **Question:** So sánh số lượng và tỷ lệ % thiết bị theo từng loại (device_type)?
- **Expected SQL:**
```sql
SELECT d.device_type,
       COUNT(*) AS device_count,
       ROUND(100.0 * COUNT(*) / t.total, 2) AS pct
FROM sdp_golden_dim_device d
CROSS JOIN (SELECT COUNT(*) AS total FROM sdp_golden_dim_device) t
GROUP BY d.device_type, t.total
ORDER BY device_count DESC
```
- **Expected Result Type:** Table

---

### Q034
- **Domain:** Device & Asset
- **Question:** Thiết bị nào đang gắn tại vị trí FLOOR_B1?
- **Expected SQL:**
```sql
SELECT da.device_name,
       da.device_type,
       da.asset_name,
       da.asset_type,
       da.asset_profile_name
FROM sdp_golden_dim_device_asset da
WHERE da.asset_name = 'FLOOR_B1'
ORDER BY da.device_type, da.device_name
```
- **Expected Result Type:** Table

---

### Q035
- **Domain:** Device & Asset
- **Question:** Vị trí nào có nhiều thiết bị nhất?
- **Expected SQL:**
```sql
SELECT da.asset_name,
       da.asset_type,
       da.asset_profile_name,
       COUNT(DISTINCT da.device_id) AS device_count
FROM sdp_golden_dim_device_asset da
GROUP BY da.asset_name, da.asset_type, da.asset_profile_name
ORDER BY device_count DESC
LIMIT 10
```
- **Expected Result Type:** Table

---

### Q036
- **Domain:** Device & Asset
- **Question:** Camera nào đang đặt tại zone hoặc vị trí có tên chứa PARKING?
- **Expected SQL:**
```sql
SELECT da.device_name,
       da.device_type,
       da.asset_name,
       da.asset_type,
       da.asset_profile_name
FROM sdp_golden_dim_device_asset da
WHERE da.device_type LIKE '%Camera%'
  AND da.asset_name LIKE '%PARKING%'
ORDER BY da.asset_name, da.device_name
```
- **Expected Result Type:** Table

---

### Q037
- **Domain:** Device & Asset
- **Question:** Số lượng thiết bị theo từng loại (device_type) tại từng loại vị trí (asset_type)?
- **Expected SQL:**
```sql
SELECT da.asset_type,
       da.device_type,
       COUNT(DISTINCT da.device_id) AS device_count
FROM sdp_golden_dim_device_asset da
GROUP BY da.asset_type, da.device_type
ORDER BY da.asset_type, device_count DESC
```
- **Expected Result Type:** Table

---

### Q038
- **Domain:** Device & Asset
- **Question:** Danh sách tất cả vị trí và số thiết bị tại mỗi vị trí?
- **Expected SQL:**
```sql
SELECT da.asset_name,
       da.asset_type,
       da.asset_profile_name,
       COUNT(DISTINCT da.device_id) AS device_count,
       COUNT(DISTINCT da.device_type) AS device_type_count
FROM sdp_golden_dim_device_asset da
GROUP BY da.asset_name, da.asset_type, da.asset_profile_name
ORDER BY device_count DESC
```
- **Expected Result Type:** Table

---

### Q039
- **Domain:** Device & Asset
- **Question:** Khu vực nào có nhiều CO2 sensor nhất?
- **Expected SQL:**
```sql
SELECT da.asset_name,
       COUNT(DISTINCT d.device_id) AS co2_sensor_count
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
WHERE d.device_type LIKE '%co2%' OR d.device_type LIKE '%CO2%'
GROUP BY da.asset_name
ORDER BY co2_sensor_count DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q040
- **Domain:** Device & Asset
- **Question:** Danh sách CO2 sensor và vị trí gắn trong toàn hệ thống?
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       da.asset_name,
       da.asset_type
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
WHERE d.device_type LIKE '%co2%' OR d.device_type LIKE '%CO2%'
ORDER BY da.asset_name, d.device_name
```
- **Expected Result Type:** Table

---

## DOMAIN 3 — TELEMETRY (Q041–Q065)

---

### Q041
- **Domain:** Telemetry
- **Question:** Tiêu thụ điện tháng này của từng đồng hồ điện?
- **Expected SQL:**
```sql
SELECT e.deviceId,
       d.device_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
WHERE DATE_FORMAT(e.tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
GROUP BY e.deviceId, d.device_name
ORDER BY consumption_kwh DESC
```
- **Expected Result Type:** Table

---

### Q042
- **Domain:** Telemetry
- **Question:** Đồng hồ điện nào tiêu thụ nhiều nhất tháng này?
- **Expected SQL:**
```sql
SELECT e.deviceId,
       d.device_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
WHERE DATE_FORMAT(e.tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
GROUP BY e.deviceId, d.device_name
ORDER BY consumption_kwh DESC
LIMIT 1
```
- **Expected Result Type:** Scalar / Single Row

---

### Q043
- **Domain:** Telemetry
- **Question:** Tổng tiêu thụ điện toàn hệ thống tháng này?
- **Expected SQL:**
```sql
SELECT ROUND(SUM(period_kwh), 3) AS total_system_kwh
FROM (
  SELECT deviceId,
         MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS period_kwh
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE DATE_FORMAT(tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
  GROUP BY deviceId
) sub
```
- **Expected Result Type:** Scalar

---

### Q044
- **Domain:** Telemetry
- **Question:** Xu hướng tiêu thụ điện theo ngày trong tuần này?
- **Expected SQL:**
```sql
SELECT sub.day,
       ROUND(SUM(sub.daily_kwh), 3) AS consumption_kwh
FROM (
  SELECT deviceId,
         DATE_FORMAT(tsDt, '%Y-%m-%d') AS day,
         MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS daily_kwh
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE YEARWEEK(CAST(tsDt AS DATE)) = YEARWEEK(CURRENT_DATE)
  GROUP BY deviceId, DATE_FORMAT(tsDt, '%Y-%m-%d')
) sub
GROUP BY sub.day
ORDER BY sub.day
```
- **Expected Result Type:** Table / Line Chart

---

### Q045
- **Domain:** Telemetry
- **Question:** So sánh tiêu thụ điện tháng này so với tháng trước?
- **Expected SQL:**
```sql
SELECT month_key AS month,
       ROUND(SUM(period_kwh), 3) AS consumption_kwh
FROM (
  SELECT deviceId,
         DATE_FORMAT(tsDt, '%Y-%m') AS month_key,
         MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS period_kwh
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE tsDt >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
  GROUP BY deviceId, DATE_FORMAT(tsDt, '%Y-%m')
) sub
GROUP BY month_key
ORDER BY month_key
```
- **Expected Result Type:** Table / Bar Chart

---

### Q046
- **Domain:** Telemetry
- **Question:** Top 5 đồng hồ điện tiêu thụ nhiều nhất 30 ngày qua?
- **Expected SQL:**
```sql
SELECT e.deviceId,
       d.device_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY e.deviceId, d.device_name
ORDER BY consumption_kwh DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q047
- **Domain:** Telemetry
- **Question:** Công suất điện hiện tại (kW) của từng đồng hồ?
- **Expected SQL:**
```sql
SELECT e.deviceId,
       d.device_name,
       e.power_active_kw,
       e.eventTime
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  GROUP BY deviceId
) latest ON e.deviceId = latest.deviceId AND e.tsDt = latest.latest
ORDER BY e.power_active_kw DESC
```
- **Expected Result Type:** Table

---

### Q048
- **Domain:** Telemetry
- **Question:** Tổng tiêu thụ nước toàn hệ thống tháng này?
- **Expected SQL:**
```sql
SELECT ROUND(SUM(period_m3), 3) AS total_water_m3
FROM (
  SELECT deviceId,
         MAX(water_volume_m3_total) - MIN(water_volume_m3_total) AS period_m3
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE DATE_FORMAT(tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
  GROUP BY deviceId
) sub
```
- **Expected Result Type:** Scalar

---

### Q049
- **Domain:** Telemetry
- **Question:** Thiết bị nào tiêu thụ nước nhiều nhất tháng này?
- **Expected SQL:**
```sql
SELECT e.deviceId,
       d.device_name,
       ROUND(MAX(e.water_volume_m3_total) - MIN(e.water_volume_m3_total), 3) AS water_m3
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
WHERE DATE_FORMAT(e.tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
GROUP BY e.deviceId, d.device_name
ORDER BY water_m3 DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q050
- **Domain:** Telemetry
- **Question:** So sánh tiêu thụ nước và điện theo thiết bị tháng này?
- **Expected SQL:**
```sql
SELECT e.deviceId,
       d.device_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS electricity_kwh,
       ROUND(MAX(e.water_volume_m3_total) - MIN(e.water_volume_m3_total), 3) AS water_m3
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
WHERE DATE_FORMAT(e.tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
GROUP BY e.deviceId, d.device_name
ORDER BY electricity_kwh DESC
```
- **Expected Result Type:** Table

---

### Q051
- **Domain:** Telemetry
- **Question:** Camera nào có CPU usage cao nhất hiện tại?
- **Expected SQL:**
```sql
SELECT c.deviceId,
       d.device_name,
       c.cpu_usage_pct,
       c.memory_used_mb,
       c.eventTime
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
  GROUP BY deviceId
) latest ON c.deviceId = latest.deviceId AND c.tsDt = latest.latest
ORDER BY c.cpu_usage_pct DESC
LIMIT 10
```
- **Expected Result Type:** Table

---

### Q052
- **Domain:** Telemetry
- **Question:** NVR nào có uptime thấp nhất hiện tại?
- **Expected SQL:**
```sql
SELECT n.deviceId,
       d.device_name,
       n.uptime_seconds,
       ROUND(n.uptime_seconds / 3600.0, 1) AS uptime_hours,
       n.eventTime
FROM sdp_near_realtime_stg_mv_dmp_tlm_nvr n
JOIN sdp_golden_dim_device d ON n.deviceId = d.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_nvr
  GROUP BY deviceId
) latest ON n.deviceId = latest.deviceId AND n.tsDt = latest.latest
ORDER BY n.uptime_seconds ASC
LIMIT 10
```
- **Expected Result Type:** Table

---

### Q053
- **Domain:** Telemetry
- **Question:** Camera nào không gửi dữ liệu trong 1 giờ qua?
- **Expected SQL:**
```sql
SELECT c.deviceId,
       d.device_name,
       MAX(c.tsDt) AS last_seen
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
GROUP BY c.deviceId, d.device_name
HAVING MAX(c.tsDt) < DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY last_seen ASC
```
- **Expected Result Type:** Table

---

### Q054
- **Domain:** Telemetry
- **Question:** Camera nào có CPU usage vượt 80% hiện tại?
- **Expected SQL:**
```sql
SELECT c.deviceId,
       d.device_name,
       c.cpu_usage_pct,
       c.memory_used_mb,
       c.eventTime
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
  GROUP BY deviceId
) latest ON c.deviceId = latest.deviceId AND c.tsDt = latest.latest
WHERE c.cpu_usage_pct > 80
ORDER BY c.cpu_usage_pct DESC
```
- **Expected Result Type:** Table

---

### Q055
- **Domain:** Telemetry
- **Question:** Camera nào có CPU và RAM cao nhất hiện tại?
- **Expected SQL:**
```sql
SELECT c.deviceId,
       d.device_name,
       c.cpu_usage_pct,
       c.memory_used_mb,
       c.eventTime
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
  GROUP BY deviceId
) latest ON c.deviceId = latest.deviceId AND c.tsDt = latest.latest
ORDER BY c.cpu_usage_pct DESC, c.memory_used_mb DESC
LIMIT 10
```
- **Expected Result Type:** Table

---

### Q056
- **Domain:** Telemetry
- **Question:** Camera nào không gửi dữ liệu trong 24 giờ qua (có thể offline)?
- **Expected SQL:**
```sql
SELECT c.deviceId,
       d.device_name,
       MAX(c.tsDt) AS last_seen
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
GROUP BY c.deviceId, d.device_name
HAVING MAX(c.tsDt) < DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY last_seen ASC
```
- **Expected Result Type:** Table

---

### Q057
- **Domain:** Telemetry
- **Question:** Top 5 camera có memory usage cao nhất hiện tại?
- **Expected SQL:**
```sql
SELECT c.deviceId,
       d.device_name,
       c.memory_used_mb,
       c.cpu_usage_pct,
       c.eventTime
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
  GROUP BY deviceId
) latest ON c.deviceId = latest.deviceId AND c.tsDt = latest.latest
ORDER BY c.memory_used_mb DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q058
- **Domain:** Telemetry
- **Question:** Bao nhiêu camera đang hoạt động (gửi dữ liệu trong 1 giờ qua)?
- **Expected SQL:**
```sql
SELECT COUNT(DISTINCT deviceId) AS active_cameras
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
WHERE tsDt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
```
- **Expected Result Type:** Scalar

---

### Q059
- **Domain:** Telemetry
- **Question:** Xu hướng CPU và RAM trung bình của camera theo ngày trong tuần này?
- **Expected SQL:**
```sql
SELECT DATE_FORMAT(tsDt, '%Y-%m-%d') AS day,
       ROUND(AVG(cpu_usage_pct), 1) AS avg_cpu_pct,
       ROUND(AVG(memory_used_mb), 1) AS avg_memory_mb,
       COUNT(DISTINCT deviceId) AS camera_count
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
WHERE YEARWEEK(CAST(tsDt AS DATE)) = YEARWEEK(CURRENT_DATE)
GROUP BY DATE_FORMAT(tsDt, '%Y-%m-%d')
ORDER BY day
```
- **Expected Result Type:** Table / Line Chart

---

### Q060
- **Domain:** Telemetry
- **Question:** Tiêu thụ điện tháng này tại tòa nhà BUILDING_001?
- **Expected SQL:**
```sql
SELECT da.asset_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
WHERE da.asset_name = 'BUILDING_001'
  AND DATE_FORMAT(e.tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
GROUP BY da.asset_name
```
- **Expected Result Type:** Scalar

---

### Q061
- **Domain:** Telemetry
- **Question:** Chiller nào đang báo lỗi (fault) trong 1 giờ gần nhất?
- **Expected SQL:**
```sql
SELECT c.deviceId,
       d.device_name,
       c.fault,
       c.chiller_state,
       c.eventTime
FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
WHERE c.fault = 1
  AND c.tsDt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY c.eventTime DESC
```
- **Expected Result Type:** Table

---

### Q062
- **Domain:** Telemetry
- **Question:** Bao nhiêu chiller đang chạy (chiller_state=1) hiện tại?
- **Expected SQL:**
```sql
SELECT COUNT(DISTINCT c.deviceId) AS running_chillers
FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller c
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller
  GROUP BY deviceId
) latest ON c.deviceId = latest.deviceId AND c.tsDt = latest.latest
WHERE c.chiller_state = 1
```
- **Expected Result Type:** Scalar

---

### Q063
- **Domain:** Telemetry
- **Question:** Chiller nào đang chạy nhưng đồng thời báo fault?
- **Expected SQL:**
```sql
SELECT c.deviceId,
       d.device_name,
       c.fault,
       c.chiller_state,
       c.eventTime
FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller
  GROUP BY deviceId
) latest ON c.deviceId = latest.deviceId AND c.tsDt = latest.latest
WHERE c.chiller_state = 1
  AND c.fault = 1
```
- **Expected Result Type:** Table

---

### Q064
- **Domain:** Telemetry
- **Question:** Chiller nào không gửi dữ liệu trong 3 giờ qua?
- **Expected SQL:**
```sql
SELECT c.deviceId,
       d.device_name,
       MAX(c.tsDt) AS last_seen
FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
GROUP BY c.deviceId, d.device_name
HAVING MAX(c.tsDt) < DATE_SUB(NOW(), INTERVAL 3 HOUR)
ORDER BY last_seen ASC
```
- **Expected Result Type:** Table

---

### Q065
- **Domain:** Telemetry
- **Question:** Tiêu thụ điện của thiết bị Chiller trong 7 ngày qua?
- **Expected SQL:**
```sql
SELECT dev.device_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev ON e.deviceId = dev.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  AND (dev.device_type LIKE '%chiller%' OR dev.device_type LIKE '%Chiller%')
GROUP BY e.deviceId, dev.device_name
ORDER BY consumption_kwh DESC
```
- **Expected Result Type:** Table

---

## DOMAIN 4 — DMP / DEVICE STATUS (Q066–Q075)

---

### Q066
- **Domain:** DMP Status
- **Question:** Thiết bị nào đang OFFLINE hiện tại?
- **Expected SQL:**
```sql
SELECT s.device_id,
       s.device_code,
       s.device_type,
       s.current_status,
       s.event_time
FROM sdp_staging_stg_dmp_device_status_events s
INNER JOIN (
  SELECT device_id, MAX(event_time) AS latest
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest_evt ON s.device_id = latest_evt.device_id AND s.event_time = latest_evt.latest
WHERE s.current_status = 'OFFLINE'
ORDER BY s.event_time DESC
```
- **Expected Result Type:** Table

---

### Q067
- **Domain:** DMP Status
- **Question:** Thiết bị nào mất kết nối nhiều lần nhất hôm nay?
- **Expected SQL:**
```sql
SELECT s.device_id,
       s.device_code,
       s.device_type,
       COUNT(*) AS disconnect_count
FROM sdp_staging_stg_dmp_device_status_events s
WHERE s.event_type = 'STATUS_CHANGE'
  AND s.current_status = 'OFFLINE'
  AND s.event_date = CAST(NOW() AS DATE)
GROUP BY s.device_id, s.device_code, s.device_type
ORDER BY disconnect_count DESC
LIMIT 10
```
- **Expected Result Type:** Table

---

### Q068
- **Domain:** DMP Status
- **Question:** Tỉ lệ online theo loại thiết bị?
- **Expected SQL:**
```sql
SELECT s.device_type,
       COUNT(*) AS total_devices,
       SUM(CAST(s.is_online AS INT)) AS online_count,
       ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(*), 2) AS online_pct
FROM sdp_staging_stg_dmp_device_status_events s
INNER JOIN (
  SELECT device_id, MAX(event_time) AS latest
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest_evt ON s.device_id = latest_evt.device_id AND s.event_time = latest_evt.latest
GROUP BY s.device_type
ORDER BY online_pct ASC
```
- **Expected Result Type:** Table

---

### Q069
- **Domain:** DMP Status
- **Question:** Tỷ lệ thiết bị đang hoạt động (uptime) toàn hệ thống?
- **Expected SQL:**
```sql
SELECT ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(*), 2) AS online_pct,
       CASE
         WHEN ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(*), 2) >= 95 THEN 'Tốt'
         WHEN ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(*), 2) >= 80 THEN 'Cần theo dõi'
         ELSE 'Thấp'
       END AS verdict
FROM sdp_staging_stg_dmp_device_status_events s
INNER JOIN (
  SELECT device_id, MAX(event_time) AS latest
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest_evt ON s.device_id = latest_evt.device_id AND s.event_time = latest_evt.latest
```
- **Expected Result Type:** Scalar

---

### Q070
- **Domain:** DMP Status
- **Question:** Tỷ lệ online của camera theo từng tòa nhà?
- **Expected SQL:**
```sql
SELECT da.asset_name,
       COUNT(DISTINCT s.device_id) AS total_cameras,
       SUM(CAST(s.is_online AS INT)) AS online_cameras,
       ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(DISTINCT s.device_id), 2) AS online_pct
FROM sdp_staging_stg_dmp_device_status_events s
INNER JOIN (
  SELECT device_id, MAX(event_time) AS latest
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest_evt ON s.device_id = latest_evt.device_id AND s.event_time = latest_evt.latest
JOIN sdp_golden_dim_device d ON s.device_id = d.device_id
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
WHERE d.device_type LIKE '%Camera%'
  AND da.asset_type = 'building'
GROUP BY da.asset_name
ORDER BY online_pct DESC
```
- **Expected Result Type:** Table

---

### Q071
- **Domain:** DMP Status
- **Question:** Thiết bị nào có số lần mất kết nối nhiều nhất trong 14 ngày qua?
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       COUNT(*) AS disconnection_count,
       MAX(s.event_time) AS last_disconnect
FROM sdp_staging_stg_dmp_device_status_events s
JOIN sdp_golden_dim_device d ON s.device_id = d.device_id
WHERE s.event_type = 'STATUS_CHANGE'
  AND s.current_status = 'OFFLINE'
  AND s.event_time >= DATE_SUB(NOW(), INTERVAL 14 DAY)
GROUP BY s.device_id, d.device_name, d.device_type
ORDER BY disconnection_count DESC
LIMIT 10
```
- **Expected Result Type:** Table

---

### Q072
- **Domain:** DMP Status
- **Question:** Danh sách camera đang bị hỏng hoặc offline?
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       s.current_status,
       s.event_time AS last_status_change
FROM sdp_staging_stg_dmp_device_status_events s
INNER JOIN (
  SELECT device_id, MAX(event_time) AS latest
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest_evt ON s.device_id = latest_evt.device_id AND s.event_time = latest_evt.latest
JOIN sdp_golden_dim_device d ON s.device_id = d.device_id
WHERE d.device_type LIKE '%Camera%'
  AND s.current_status IN ('OFFLINE', 'MAINTENANCE')
ORDER BY s.event_time ASC
```
- **Expected Result Type:** Table

---

### Q073
- **Domain:** DMP Status
- **Question:** Thiết bị nào có qualityScore kết nối thấp nhất (dưới 50)?
- **Expected SQL:**
```sql
SELECT r.deviceId,
       d.device_name,
       d.device_type,
       r.qualityScore,
       r.icmpReachable,
       r.status,
       r.tsDt AS last_event_time
FROM sdp_near_realtime_raw_dmp_evt_connectivity r
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_raw_dmp_evt_connectivity
  GROUP BY deviceId
) x ON r.deviceId = x.deviceId AND r.tsDt = x.latest
JOIN sdp_golden_dim_device d ON r.deviceId = d.device_id
WHERE r.qualityScore < 50
ORDER BY r.qualityScore ASC
```
- **Expected Result Type:** Table

---

### Q074
- **Domain:** DMP Status
- **Question:** Lý do offline phổ biến nhất trong tuần qua?
- **Expected SQL:**
```sql
SELECT r.offlineReason,
       COUNT(*) AS event_count,
       COUNT(DISTINCT r.deviceId) AS device_count
FROM sdp_near_realtime_raw_dmp_evt_connectivity r
WHERE r.status = 'OFFLINE'
  AND r.offlineReason IS NOT NULL
  AND r.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY r.offlineReason
ORDER BY event_count DESC
```
- **Expected Result Type:** Table

---

### Q075
- **Domain:** DMP Status
- **Question:** Danh sách thiết bị không có telemetry trong 24 giờ qua?
- **Expected SQL:**
```sql
SELECT d.device_id,
       d.device_name,
       d.device_type,
       MAX(t.tsDt) AS last_telemetry_time
FROM sdp_golden_dim_device d
LEFT JOIN sdp_near_realtime_raw_dmp_tlm_raw t ON d.device_id = t.deviceId
  AND t.tsDt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
WHERE t.deviceId IS NULL
GROUP BY d.device_id, d.device_name, d.device_type
ORDER BY d.device_type, d.device_name
```
- **Expected Result Type:** Table

---

## DOMAIN 5 — ISO 37122 SMART CITY KPIs (Q076–Q095)

---

### Q076
- **Domain:** ISO 37122
- **ISO Ref:** §7.2 — Smart meter (energy)
- **Question:** Tổng số thiết bị đo điện thông minh (energy meter) trong hệ thống?
- **Expected SQL:**
```sql
SELECT COUNT(DISTINCT d.device_id) AS energy_meter_count
FROM sdp_golden_dim_device d
WHERE d.device_type LIKE '%ENERGY_METER%'
   OR d.device_type LIKE '%energy_meter%'
   OR d.device_type LIKE '%energy-meter%'
```
- **Expected Result Type:** Scalar

---

### Q077
- **Domain:** ISO 37122
- **ISO Ref:** §7.3 — Smart streetlighting
- **Question:** Hệ thống có bao nhiêu thiết bị chiếu sáng thông minh?
- **Expected SQL:**
```sql
SELECT COUNT(*) AS lighting_device_count
FROM sdp_golden_dim_device
WHERE device_type LIKE '%light%'
   OR device_type LIKE '%Light%'
   OR device_type LIKE '%lamp%'
   OR device_type LIKE '%lighting%'
```
- **Expected Result Type:** Scalar

---

### Q078
- **Domain:** ISO 37122
- **ISO Ref:** §7.7 — Energy intensity
- **Question:** Tổng tiêu thụ điện năng toàn hệ thống trong tháng 6/2026 là bao nhiêu kWh?
- **Expected SQL:**
```sql
SELECT ROUND(SUM(period_kwh), 3) AS total_kwh_june_2026
FROM (
  SELECT deviceId,
         MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS period_kwh
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE DATE_FORMAT(tsDt, '%Y-%m') = '2026-06'
  GROUP BY deviceId
) sub
```
- **Expected Result Type:** Scalar

---

### Q079
- **Domain:** ISO 37122
- **ISO Ref:** §7.7 — Energy intensity
- **Question:** Tiêu thụ điện trung bình mỗi ngày của toàn hệ thống trong tháng này?
- **Expected SQL:**
```sql
SELECT ROUND(AVG(daily_kwh), 3) AS avg_daily_kwh
FROM (
  SELECT DATE_FORMAT(tsDt, '%Y-%m-%d') AS day,
         SUM(MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total)) AS daily_kwh
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE DATE_FORMAT(tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
  GROUP BY deviceId, DATE_FORMAT(tsDt, '%Y-%m-%d')
) sub
GROUP BY day
```
- **Expected Result Type:** Scalar

---

### Q080
- **Domain:** ISO 37122
- **ISO Ref:** §10.3 — Infrastructure uptime
- **Question:** Tỷ lệ uptime tổng thể của toàn bộ thiết bị IoT trong hệ thống?
- **Expected SQL:**
```sql
SELECT ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(*), 2) AS uptime_pct
FROM sdp_staging_stg_dmp_device_status_events s
INNER JOIN (
  SELECT device_id, MAX(event_time) AS latest
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest_evt ON s.device_id = latest_evt.device_id AND s.event_time = latest_evt.latest
```
- **Expected Result Type:** Scalar

---

### Q081
- **Domain:** ISO 37122
- **ISO Ref:** §15.1 — CCTV density
- **Question:** Tổng số camera giám sát (CCTV) trong hệ thống?
- **Expected SQL:**
```sql
SELECT COUNT(*) AS cctv_total
FROM sdp_golden_dim_device
WHERE device_type LIKE '%Camera%'
   OR device_type LIKE '%camera%'
   OR device_type LIKE '%CCTV%'
```
- **Expected Result Type:** Scalar

---

### Q082
- **Domain:** ISO 37122
- **ISO Ref:** §15.1 — CCTV density
- **Question:** Phân bố camera giám sát theo từng tòa nhà?
- **Expected SQL:**
```sql
SELECT da.asset_name,
       COUNT(DISTINCT d.device_id) AS camera_count
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
WHERE (d.device_type LIKE '%Camera%' OR d.device_type LIKE '%camera%')
  AND da.asset_type = 'building'
GROUP BY da.asset_name
ORDER BY camera_count DESC
```
- **Expected Result Type:** Table

---

### Q083
- **Domain:** ISO 37122
- **ISO Ref:** §15.2 — Crime detection rate (proxy)
- **Question:** Bao nhiêu camera đã gửi telemetry trong 24 giờ qua (camera đang hoạt động)?
- **Expected SQL:**
```sql
SELECT COUNT(DISTINCT deviceId) AS active_cameras_24h
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
WHERE tsDt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
```
- **Expected Result Type:** Scalar

---

### Q084
- **Domain:** ISO 37122
- **ISO Ref:** §18.4 — IoT device density
- **Question:** Tổng số thiết bị IoT hạ tầng đang có trong hệ thống?
- **Expected SQL:**
```sql
SELECT COUNT(*) AS total_iot_devices
FROM sdp_golden_dim_device
```
- **Expected Result Type:** Scalar

---

### Q085
- **Domain:** ISO 37122
- **ISO Ref:** §18.4 — IoT device density
- **Question:** Phân bố thiết bị IoT theo loại thiết bị và tòa nhà?
- **Expected SQL:**
```sql
SELECT da.asset_name AS building,
       d.device_type,
       COUNT(DISTINCT d.device_id) AS device_count
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
WHERE da.asset_type = 'building'
GROUP BY da.asset_name, d.device_type
ORDER BY da.asset_name, device_count DESC
```
- **Expected Result Type:** Table

---

### Q086
- **Domain:** ISO 37122
- **ISO Ref:** §19.3 — Parking availability
- **Question:** Tổng số xe hiện đang đỗ trong toàn bộ hệ thống bãi đỗ?
- **Expected SQL:**
```sql
SELECT SUM(current_occupancy) AS total_parked_vehicles
FROM sdp_mart_fct_parking_occupancy
WHERE occupancy_hour = (
  SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy
)
```
- **Expected Result Type:** Scalar

---

### Q087
- **Domain:** ISO 37122
- **ISO Ref:** §19.3 — Parking availability
- **Question:** Tỷ lệ xe đang đỗ theo từng khu vực (area) hiện tại?
- **Expected SQL:**
```sql
SELECT l.area_id,
       SUM(o.current_occupancy) AS vehicles_parked,
       ROUND(100.0 * SUM(o.current_occupancy) / t.total, 2) AS occupancy_pct
FROM sdp_mart_fct_parking_occupancy o
JOIN sdp_golden_dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
CROSS JOIN (
  SELECT SUM(current_occupancy) AS total
  FROM sdp_mart_fct_parking_occupancy
  WHERE occupancy_hour = (SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy)
) t
WHERE o.occupancy_hour = (SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy)
GROUP BY l.area_id, t.total
ORDER BY vehicles_parked DESC
```
- **Expected Result Type:** Table

---

### Q088
- **Domain:** ISO 37122
- **ISO Ref:** §19.3 — Parking availability (EV)
- **Question:** Bãi đỗ nào có nhiều giao dịch xe EV nhất tháng này?
- **Expected SQL:**
```sql
SELECT e.parking_lot_id,
       l.pk_lot_name,
       l.area_id,
       COUNT(*) AS ev_transactions,
       SUM(e.amount_due) AS revenue_vnd
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND e.vehicle_type = 'EV'
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY e.parking_lot_id, l.pk_lot_name, l.area_id
ORDER BY ev_transactions DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q089
- **Domain:** ISO 37122
- **ISO Ref:** §7.2 — Smart meter ratio
- **Question:** Tỷ lệ thiết bị đo điện thông minh trên tổng số thiết bị trong hệ thống?
- **Expected SQL:**
```sql
SELECT em.meter_count,
       total.total_count,
       ROUND(100.0 * em.meter_count / total.total_count, 2) AS smart_meter_pct
FROM (
  SELECT COUNT(DISTINCT deviceId) AS meter_count
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
) em
CROSS JOIN (
  SELECT COUNT(*) AS total_count
  FROM sdp_golden_dim_device
) total
```
- **Expected Result Type:** Scalar / Single Row

---

### Q090
- **Domain:** ISO 37122
- **ISO Ref:** §10.3 — Infrastructure uptime
- **Question:** Loại thiết bị nào có tỷ lệ offline cao nhất trong 14 ngày qua?
- **Expected SQL:**
```sql
SELECT d.device_type,
       COUNT(*) AS total_events,
       SUM(CASE WHEN s.current_status = 'OFFLINE' THEN 1 ELSE 0 END) AS offline_events,
       ROUND(100.0 * SUM(CASE WHEN s.current_status = 'OFFLINE' THEN 1 ELSE 0 END) / COUNT(*), 2) AS offline_pct
FROM sdp_staging_stg_dmp_device_status_events s
JOIN sdp_golden_dim_device d ON s.device_id = d.device_id
WHERE s.event_type = 'STATUS_CHANGE'
  AND s.event_time >= DATE_SUB(NOW(), INTERVAL 14 DAY)
GROUP BY d.device_type
ORDER BY offline_pct DESC
```
- **Expected Result Type:** Table

---

### Q091
- **Domain:** ISO 37122
- **ISO Ref:** §7.7 — Energy intensity by building
- **Question:** Top 5 tòa nhà tiêu thụ điện nhiều nhất trong 30 ngày qua?
- **Expected SQL:**
```sql
SELECT da.asset_name AS building,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND da.asset_type = 'building'
GROUP BY da.asset_name
ORDER BY consumption_kwh DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q092
- **Domain:** ISO 37122
- **ISO Ref:** §10.3 — Uptime by device type and building
- **Question:** Tỷ lệ online theo từng loại thiết bị và từng tòa nhà?
- **Expected SQL:**
```sql
SELECT da.asset_name AS building,
       d.device_type,
       COUNT(DISTINCT s.device_id) AS total,
       SUM(CAST(s.is_online AS INT)) AS online_count,
       ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(DISTINCT s.device_id), 2) AS online_pct
FROM sdp_staging_stg_dmp_device_status_events s
INNER JOIN (
  SELECT device_id, MAX(event_time) AS latest
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest_evt ON s.device_id = latest_evt.device_id AND s.event_time = latest_evt.latest
JOIN sdp_golden_dim_device d ON s.device_id = d.device_id
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
WHERE da.asset_type = 'building'
GROUP BY da.asset_name, d.device_type
ORDER BY da.asset_name, online_pct ASC
```
- **Expected Result Type:** Table

---

### Q093
- **Domain:** ISO 37122
- **ISO Ref:** §15.1 — CCTV density proxy
- **Question:** Số camera giám sát trên mỗi tòa nhà và tỷ lệ camera đang online?
- **Expected SQL:**
```sql
SELECT da.asset_name AS building,
       COUNT(DISTINCT d.device_id) AS total_cameras,
       SUM(CAST(s.is_online AS INT)) AS online_cameras,
       ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(DISTINCT d.device_id), 2) AS online_pct
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN sdp_staging_stg_dmp_device_status_events s ON d.device_id = s.device_id
LEFT JOIN (
  SELECT device_id, MAX(event_time) AS latest
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest_evt ON s.device_id = latest_evt.device_id AND s.event_time = latest_evt.latest
WHERE (d.device_type LIKE '%Camera%' OR d.device_type LIKE '%camera%')
  AND da.asset_type = 'building'
GROUP BY da.asset_name
ORDER BY total_cameras DESC
```
- **Expected Result Type:** Table

---

### Q094
- **Domain:** ISO 37122
- **ISO Ref:** §19.3 — Parking availability trend
- **Question:** Xu hướng tổng số xe đang đỗ theo giờ trong 7 ngày qua?
- **Expected SQL:**
```sql
SELECT o.occupancy_date,
       t.hour,
       SUM(o.current_occupancy) AS total_parked
FROM sdp_mart_fct_parking_occupancy o
JOIN sdp_golden_dim_time t ON o.occupancy_time_key = t.time_key
WHERE o.occupancy_date >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 7 DAY), '%Y-%m-%d')
GROUP BY o.occupancy_date, t.hour
ORDER BY o.occupancy_date, t.hour
```
- **Expected Result Type:** Table / Line Chart

---

### Q095
- **Domain:** ISO 37122
- **ISO Ref:** §18.4 — IoT device connectivity
- **Question:** Thiết bị IoT nào chưa gửi telemetry trong 7 ngày qua?
- **Expected SQL:**
```sql
SELECT d.device_id,
       d.device_name,
       d.device_type,
       MAX(t.tsDt) AS last_telemetry_time
FROM sdp_golden_dim_device d
LEFT JOIN sdp_near_realtime_raw_dmp_tlm_raw t ON d.device_id = t.deviceId
  AND t.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
WHERE t.deviceId IS NULL
GROUP BY d.device_id, d.device_name, d.device_type
ORDER BY d.device_type, d.device_name
```
- **Expected Result Type:** Table

---

## DOMAIN 6 — CROSS-DOMAIN COMPLEX (Q096–Q100)

---

### Q096
- **Domain:** Cross-domain
- **Question:** Tòa nhà nào có nhiều thiết bị nhất và tổng tiêu thụ điện trong tuần này?
- **Expected SQL:**
```sql
SELECT da.asset_name AS building,
       COUNT(DISTINCT d.device_id) AS device_count,
       ROUND(SUM(e.energy_active_kwh_total_max - e.energy_active_kwh_total_min), 3) AS weekly_kwh
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN (
  SELECT deviceId,
         MAX(energy_active_kwh_total) AS energy_active_kwh_total_max,
         MIN(energy_active_kwh_total) AS energy_active_kwh_total_min
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE YEARWEEK(CAST(tsDt AS DATE)) = YEARWEEK(CURRENT_DATE)
  GROUP BY deviceId
) e ON d.device_id = e.deviceId
WHERE da.asset_type = 'building'
GROUP BY da.asset_name
ORDER BY device_count DESC
LIMIT 10
```
- **Expected Result Type:** Table

---

### Q097
- **Domain:** Cross-domain
- **Question:** Camera nào đang online nhưng có CPU > 80% và thuộc tòa nhà nào?
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       c.cpu_usage_pct,
       c.memory_used_mb,
       da.asset_name AS building,
       s.current_status
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
  GROUP BY deviceId
) latest ON c.deviceId = latest.deviceId AND c.tsDt = latest.latest
LEFT JOIN sdp_staging_stg_dmp_device_status_events s ON d.device_id = s.device_id
LEFT JOIN (
  SELECT device_id, MAX(event_time) AS latest_evt
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) lev ON s.device_id = lev.device_id AND s.event_time = lev.latest_evt
WHERE c.cpu_usage_pct > 80
  AND da.asset_type = 'building'
ORDER BY c.cpu_usage_pct DESC
```
- **Expected Result Type:** Table

---

### Q098
- **Domain:** Cross-domain
- **Question:** Top 5 loại thiết bị theo số lượng và tỷ lệ online hiện tại?
- **Expected SQL:**
```sql
SELECT d.device_type,
       COUNT(DISTINCT d.device_id) AS total_count,
       SUM(CAST(s.is_online AS INT)) AS online_count,
       ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(DISTINCT d.device_id), 2) AS online_pct
FROM sdp_golden_dim_device d
LEFT JOIN sdp_staging_stg_dmp_device_status_events s ON d.device_id = s.device_id
LEFT JOIN (
  SELECT device_id, MAX(event_time) AS latest
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest_evt ON s.device_id = latest_evt.device_id AND s.event_time = latest_evt.latest
GROUP BY d.device_type
ORDER BY total_count DESC
LIMIT 5
```
- **Expected Result Type:** Table

---

### Q099
- **Domain:** Cross-domain
- **Question:** Thiết bị nào vừa có cảnh báo fault chiller vừa có trạng thái offline trong 24 giờ qua?
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       c.fault,
       c.chiller_state,
       c.eventTime AS fault_time,
       s.current_status,
       s.event_time AS offline_time
FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
JOIN sdp_staging_stg_dmp_device_status_events s ON d.device_id = s.device_id
WHERE c.fault = 1
  AND c.tsDt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
  AND s.current_status = 'OFFLINE'
  AND s.event_type = 'STATUS_CHANGE'
  AND s.event_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY c.eventTime DESC
```
- **Expected Result Type:** Table

---

### Q100
- **Domain:** Cross-domain
- **Question:** Tổng quan hệ thống: số thiết bị, tỷ lệ online, tổng tiêu thụ điện tháng này, tổng doanh thu parking tháng này?
- **Expected SQL:**
```sql
SELECT
  (SELECT COUNT(*) FROM sdp_golden_dim_device) AS total_devices,
  (SELECT ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(*), 2)
   FROM sdp_staging_stg_dmp_device_status_events s
   INNER JOIN (
     SELECT device_id, MAX(event_time) AS latest
     FROM sdp_staging_stg_dmp_device_status_events
     WHERE event_type = 'STATUS_CHANGE'
     GROUP BY device_id
   ) le ON s.device_id = le.device_id AND s.event_time = le.latest
  ) AS online_pct,
  (SELECT ROUND(SUM(period_kwh), 3)
   FROM (
     SELECT deviceId, MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS period_kwh
     FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
     WHERE DATE_FORMAT(tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
     GROUP BY deviceId
   ) sub
  ) AS total_kwh_this_month,
  (SELECT SUM(amount_due)
   FROM sdp_golden_fct_vehicle_events e
   JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
   WHERE e.history_state = 'COMPLETED'
     AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
  ) AS parking_revenue_this_month
```
- **Expected Result Type:** Single Row (Dashboard KPIs)

---

## DOMAIN 7 — SQL PAIRS BỔ SUNG (Q101–Q119)
*(Các câu từ sql_pairs database chưa được cover trong Q001–Q100)*

---

### Q101
- **Domain:** Parking · Source: SP-PRK-04
- **Question:** So sánh doanh thu và số giao dịch theo từng loại xe (CAR, MOTORBIKE, TRUCK, EV) trong tháng này?
- **Expected SQL:**
```sql
SELECT e.vehicle_type,
       SUM(e.amount_due)          AS revenue_vnd,
       COUNT(*)                   AS transactions,
       ROUND(AVG(e.amount_due),0) AS avg_fee_vnd
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY e.vehicle_type
ORDER BY revenue_vnd DESC
```
- **Expected Result Type:** Table (by vehicle_type)

---

### Q102
- **Domain:** Parking · Source: SP-PRK-12
- **Question:** Doanh thu theo từng loại xe trong 30 ngày qua là bao nhiêu?
- **Expected SQL:**
```sql
SELECT e.vehicle_type,
       SUM(e.amount_due)          AS revenue_vnd,
       COUNT(*)                   AS transactions,
       ROUND(AVG(e.amount_due),0) AS avg_fee_vnd
FROM sdp_golden_fct_vehicle_events e
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY),'%Y%m%d') AS INT)
GROUP BY e.vehicle_type
ORDER BY revenue_vnd DESC
```
- **Expected Result Type:** Table (by vehicle_type)

---

### Q103
- **Domain:** Parking · Source: SP-PRK-21
- **Question:** Tỉ lệ phần trăm từng loại xe trong tổng giao dịch tháng này?
- **Expected SQL:**
```sql
SELECT e.vehicle_type,
       COUNT(*)                                          AS transactions,
       SUM(e.amount_due)                                AS revenue_vnd,
       ROUND(100.0 * COUNT(*) / t.total, 2)            AS pct
FROM sdp_golden_fct_vehicle_events e
CROSS JOIN (
  SELECT COUNT(*) AS total
  FROM sdp_golden_fct_vehicle_events e2
  JOIN sdp_golden_dim_date d2 ON e2.check_out_date_key = d2.date_key
  WHERE e2.history_state = 'COMPLETED'
    AND d2.year = YEAR(NOW()) AND d2.month = MONTH(NOW())
) t
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND d.year = YEAR(NOW()) AND d.month = MONTH(NOW())
GROUP BY e.vehicle_type, t.total
ORDER BY transactions DESC
```
- **Expected Result Type:** Table (vehicle_type, %, revenue)

---

### Q104
- **Domain:** Parking · Source: SP-PRK-29
- **Question:** Có bao nhiêu giao dịch raw chưa được xử lý (chưa COMPLETED) trong 7 ngày qua?
- **Expected SQL:**
```sql
SELECT history_state,
       COUNT(*)          AS transaction_count,
       MIN(check_in_at)  AS earliest,
       MAX(check_out_at) AS latest
FROM sdp_raw_raw_parking_db_vehicle_histories
WHERE history_state != 'COMPLETED'
  AND processing_day >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 7 DAY),'%Y-%m-%d')
GROUP BY history_state
ORDER BY transaction_count DESC
```
- **Expected Result Type:** Table (history_state, count)

---

### Q105
- **Domain:** Parking · Source: SP-PRK-30
- **Question:** Bãi đỗ xe nào có nhiều giao dịch raw nhất hôm nay và tỉ lệ COMPLETED là bao nhiêu?
- **Expected SQL:**
```sql
SELECT pk_lot_id,
       pk_lot_name,
       COUNT(*)                                                               AS raw_transactions,
       SUM(CASE WHEN history_state = 'COMPLETED' THEN 1 ELSE 0 END)          AS completed,
       SUM(CASE WHEN history_state != 'COMPLETED' THEN 1 ELSE 0 END)         AS pending_or_error
FROM sdp_raw_raw_parking_db_vehicle_histories
WHERE processing_day = DATE_FORMAT(NOW(),'%Y-%m-%d')
GROUP BY pk_lot_id, pk_lot_name
ORDER BY raw_transactions DESC
```
- **Expected Result Type:** Table (lot, total raw, completed, pending)

---

### Q106
- **Domain:** Device & Asset · Source: SP-DEV-04
- **Question:** Thiết bị BMS_CO2_SENSOR_01061 đang được gắn tại vị trí (asset) nào?
- **Expected SQL:**
```sql
SELECT device_name,
       device_type,
       asset_name,
       asset_type,
       asset_profile_name
FROM sdp_golden_dim_device_asset
WHERE device_name = 'BMS_CO2_SENSOR_01061'
```
- **Expected Result Type:** Single Row (device location)

---

### Q107
- **Domain:** Device & Asset · Source: SP-DEV-13
- **Question:** Danh sách các thang máy đang ở trạng thái bảo trì hoặc hỏng?
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       s.current_status,
       s.event_time AS last_status_time
FROM sdp_golden_dim_device d
LEFT JOIN sdp_staging_stg_dmp_device_status_events s ON d.device_id = s.device_id
LEFT JOIN (
  SELECT device_id, MAX(event_time) AS max_evt
  FROM sdp_staging_stg_dmp_device_status_events
  WHERE event_type = 'STATUS_CHANGE'
  GROUP BY device_id
) latest ON s.device_id = latest.device_id AND s.event_time = latest.max_evt
WHERE (d.device_type LIKE '%elevator%' OR d.device_type LIKE '%Elevator%'
    OR d.device_type LIKE '%lift%')
  AND (s.current_status IN ('OFFLINE','MAINTENANCE') OR s.device_id IS NULL)
GROUP BY d.device_name, d.device_type, s.current_status, s.event_time
ORDER BY last_status_time ASC
```
- **Expected Result Type:** Table (elevator, status, last seen)

---

### Q108
- **Domain:** DMP Status · Source: SP-DMP-11
- **Question:** Có bao nhiêu telemetry event từ mỗi loại thiết bị trong ngày hôm nay?
- **Expected SQL:**
```sql
SELECT t.deviceType,
       COUNT(*)                     AS event_count,
       COUNT(DISTINCT t.deviceId)   AS device_count
FROM sdp_near_realtime_raw_dmp_tlm_raw t
WHERE t.tsDt >= DATE_FORMAT(NOW(),'%Y-%m-%d 00:00:00')
GROUP BY t.deviceType
ORDER BY event_count DESC
```
- **Expected Result Type:** Table (deviceType, event_count, device_count)

---

### Q109
- **Domain:** Telemetry – Nước · Source: SP-TLM-14
- **Question:** Xu hướng tiêu thụ nước theo từng ngày trong tháng này?
- **Expected SQL:**
```sql
SELECT sub.day,
       ROUND(SUM(sub.daily_m3), 3) AS water_m3
FROM (
  SELECT deviceId,
         DATE_FORMAT(tsDt,'%Y-%m-%d')                               AS day,
         MAX(water_volume_m3_total) - MIN(water_volume_m3_total)    AS daily_m3
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE DATE_FORMAT(tsDt,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m')
  GROUP BY deviceId, DATE_FORMAT(tsDt,'%Y-%m-%d')
) sub
GROUP BY sub.day
ORDER BY sub.day
```
- **Expected Result Type:** Chart – Line (water m³/ngày)

---

### Q110
- **Domain:** Telemetry – Điện & Nước · Source: SP-TLM-15
- **Question:** Tổng tiêu thụ điện và nước theo từng tháng trong năm nay?
- **Expected SQL:**
```sql
SELECT month_key                       AS month,
       ROUND(SUM(elec_kwh), 3)         AS electricity_kwh,
       ROUND(SUM(water_m3), 3)         AS water_m3
FROM (
  SELECT deviceId,
         DATE_FORMAT(tsDt,'%Y-%m')                                  AS month_key,
         MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS elec_kwh,
         MAX(water_volume_m3_total)   - MIN(water_volume_m3_total)   AS water_m3
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE YEAR(tsDt) = YEAR(NOW())
  GROUP BY deviceId, DATE_FORMAT(tsDt,'%Y-%m')
) sub
GROUP BY month_key
ORDER BY month_key
```
- **Expected Result Type:** Chart – Bar (kWh + m³ theo tháng)

---

### Q111
- **Domain:** Telemetry – Điện · Source: SP-TLM-26
- **Question:** Xu hướng tiêu thụ điện của đồng hồ điện trong 3 tháng gần nhất?
- **Expected SQL:**
```sql
SELECT DATE_FORMAT(e.tsDt,'%Y-%m')                                    AS year_month,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
GROUP BY DATE_FORMAT(e.tsDt,'%Y-%m')
ORDER BY year_month
```
- **Expected Result Type:** Chart – Line (kWh/tháng)

---

### Q112
- **Domain:** Telemetry – Điện · Source: SP-TLM-27
- **Question:** Top khu vực tiêu thụ điện nhiều nhất trong 30 ngày qua?
- **Expected SQL:**
```sql
SELECT da.asset_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev        ON e.deviceId = dev.device_id
JOIN sdp_golden_dim_device_asset da   ON dev.device_id = da.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY da.asset_name
ORDER BY consumption_kwh DESC
LIMIT 5
```
- **Expected Result Type:** Chart – Bar (top 5 khu vực)

---

### Q113
- **Domain:** Telemetry – Điện · Source: SP-TLM-30
- **Question:** Số liệu và xu hướng tiêu thụ điện tháng trước khu vực C theo từng ngày?
- **Expected SQL:**
```sql
SELECT DATE_FORMAT(e.tsDt,'%Y-%m-%d')                                  AS day,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev      ON e.deviceId = dev.device_id
JOIN sdp_golden_dim_device_asset da ON dev.device_id = da.device_id
WHERE DATE_FORMAT(e.tsDt,'%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH),'%Y-%m')
  AND da.asset_name LIKE '%C%'
GROUP BY DATE_FORMAT(e.tsDt,'%Y-%m-%d')
ORDER BY day
```
- **Expected Result Type:** Chart – Line (kWh/ngày tháng trước)

---

### Q114
- **Domain:** Telemetry – Camera · Source: SP-TLM-31
- **Question:** Danh sách camera bị hỏng hoặc offline (không gửi dữ liệu trong 24 giờ)?
- **Expected SQL:**
```sql
SELECT dev.device_name,
       dev.device_type,
       MAX(c.tsDt) AS last_seen
FROM sdp_golden_dim_device dev
LEFT JOIN sdp_near_realtime_stg_mv_dmp_tlm_camera c ON dev.device_id = c.deviceId
WHERE dev.device_type LIKE '%Camera%'
GROUP BY dev.device_id, dev.device_name, dev.device_type
HAVING MAX(c.tsDt) < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    OR MAX(c.tsDt) IS NULL
ORDER BY last_seen ASC
```
- **Expected Result Type:** Table (camera, last_seen)

---

### Q115
- **Domain:** Telemetry – Chiller · Source: SP-TLM-32
- **Question:** Chiller nào đang tiêu thụ điện cao bất thường so với 30 ngày qua (deviation > 30%)?
- **Expected SQL:**
```sql
SELECT dev.device_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS today_kwh,
       ROUND(baseline.avg_daily_kwh, 3)                                          AS avg_daily_kwh,
       ROUND(100.0 * (MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total)
             - baseline.avg_daily_kwh) / baseline.avg_daily_kwh, 1)              AS deviation_pct
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev ON e.deviceId = dev.device_id
JOIN (
  SELECT sub.deviceId, AVG(sub.daily_kwh) AS avg_daily_kwh
  FROM (
    SELECT deviceId,
           DATE_FORMAT(tsDt,'%Y-%m-%d') AS day,
           MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS daily_kwh
    FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
    WHERE tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY deviceId, DATE_FORMAT(tsDt,'%Y-%m-%d')
  ) sub
  GROUP BY sub.deviceId
) baseline ON e.deviceId = baseline.deviceId
WHERE DATE_FORMAT(e.tsDt,'%Y-%m-%d') = DATE_FORMAT(NOW(),'%Y-%m-%d')
  AND (dev.device_type LIKE '%Chiller%' OR dev.device_type LIKE '%chiller%')
GROUP BY dev.device_id, dev.device_name, baseline.avg_daily_kwh
HAVING ABS(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total) - baseline.avg_daily_kwh)
       / baseline.avg_daily_kwh > 0.30
ORDER BY deviation_pct DESC
```
- **Expected Result Type:** Table (chiller, today_kwh, avg, deviation%)

---

### Q116
- **Domain:** Telemetry – Điện · Source: SP-TLM-34
- **Question:** Xu hướng tiêu thụ điện khu vực B trong tuần qua theo từng ngày?
- **Expected SQL:**
```sql
SELECT DATE_FORMAT(e.tsDt,'%Y-%m-%d')                                   AS day,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev      ON e.deviceId = dev.device_id
JOIN sdp_golden_dim_device_asset da ON dev.device_id = da.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  AND da.asset_name LIKE '%B%'
GROUP BY DATE_FORMAT(e.tsDt,'%Y-%m-%d')
ORDER BY day
```
- **Expected Result Type:** Chart – Line (kWh/ngày khu vực B)

---

### Q117
- **Domain:** Telemetry – CO2 · Source: SP-TLM-36
- **Question:** Danh sách các CO2 sensor được lắp tại tầng 3 tòa nhà A?
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       da.asset_name
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
WHERE (d.device_type LIKE '%co2%' OR d.device_type LIKE '%CO2%')
  AND da.asset_name LIKE '%FLOOR%3%'
ORDER BY da.asset_name, d.device_name
```
- **Expected Result Type:** Table (device, floor)

---

### Q118
- **Domain:** Telemetry – Camera · Source: SP-TLM-39
- **Question:** Camera nào có chất lượng hình ảnh kém (CPU > 70% hoặc bộ nhớ thấp)?
- **Expected SQL:**
```sql
SELECT d.device_name,
       c.cpu_usage_pct,
       c.memory_used_mb,
       c.memory_free_mb
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
  GROUP BY deviceId
) x ON c.deviceId = x.deviceId AND c.tsDt = x.latest
WHERE c.cpu_usage_pct > 70
ORDER BY c.cpu_usage_pct DESC
```
- **Expected Result Type:** Table (camera, cpu%, memory)

---

### Q119
- **Domain:** Telemetry – Chiller · Source: SP-TLM-40
- **Question:** Trạng thái làm lạnh trung bình (chiller_state) của tất cả chiller trong tuần trước?
- **Expected SQL:**
```sql
SELECT c.deviceId,
       ROUND(AVG(c.chiller_state), 2) AS avg_chiller_state
FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller c
WHERE c.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY c.deviceId
```
- **Expected Result Type:** Table (chiller, avg_state)

---

## DOMAIN 8 — CÂU HỎI TỪ AC.XLSX (Q120–Q149)
*(Nguồn: Task 3 AC4 — 30 câu test chính thức cho Smart City Chatbot)*

> **Lưu ý:** Nhiều câu AC.xlsx tham chiếu device type không có bảng telemetry riêng  
> (FCU_FAN_COIL, ACB_BREAKER, WATER_TANK_LEVEL, CO2 ppm, Face Terminal, SMART_BUTTON).  
> SQL mong đợi sử dụng `dim_device` + `stg_dmp_device_status_events` là bảng gần nhất.  
> Default rules áp dụng: Metric → 30d rolling; Top → N=5; Uptime ≥95%=Tốt / 80–95%=Theo dõi / <80%=Thấp

---

### Q120
- **Domain:** AC.xlsx · AC-1
- **Question:** Tiêu thụ điện của khu vực A là bao nhiêu?
- **Default:** Thời gian mơ hồ → 30 ngày rolling; không grain → trả tổng 1 số
- **Expected SQL:**
```sql
SELECT da.asset_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev      ON e.deviceId = dev.device_id
JOIN sdp_golden_dim_device_asset da ON dev.device_id = da.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND da.asset_name LIKE '%A%'
GROUP BY da.asset_name
```
- **Expected Result Type:** Scalar (tổng kWh 30 ngày)

---

### Q121
- **Domain:** AC.xlsx · AC-2
- **Question:** Tòa nhà BUILDING_001 đang có bao nhiêu thiết bị FCU_FAN_COIL đang hoạt động?
- **Default:** Query tại CURRENT_TIMESTAMP; scope = tòa nhà user hỏi
- **Expected SQL:**
```sql
SELECT COUNT(*) AS active_fcu_count
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN (
  SELECT device_id, current_status
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE d.device_type LIKE '%FCU%'
  AND da.asset_name LIKE '%BUILDING_001%'
  AND (latest.current_status = 'ONLINE' OR latest.current_status IS NULL)
```
- **Expected Result Type:** Scalar (số FCU đang active)

---

### Q122
- **Domain:** AC.xlsx · AC-3
- **Question:** Mực nước bồn chứa WATER_TANK_LEVEL hiện tại của hệ thống?
- **Default:** Query tại CURRENT_TIMESTAMP; scope gần nhất user
- **Note:** Không có bảng telemetry WATER_TANK → trả thông tin thiết bị qua dim_device
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       da.asset_name,
       s.current_status,
       s.event_time AS last_updated
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE d.device_type LIKE '%WATER_TANK%' OR d.device_type LIKE '%water_tank%'
ORDER BY da.asset_name
```
- **Expected Result Type:** Table (water tank device, status, location)

---

### Q123
- **Domain:** AC.xlsx · AC-4
- **Question:** Tổng tiêu thụ điện của CHILLER trong 7 ngày qua là bao nhiêu kWh?
- **Default:** "7 ngày qua" = user nói rõ → historical; không grain → tổng
- **Expected SQL:**
```sql
SELECT dev.device_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev ON e.deviceId = dev.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  AND (dev.device_type LIKE '%chiller%' OR dev.device_type LIKE '%Chiller%')
GROUP BY e.deviceId, dev.device_name
ORDER BY consumption_kwh DESC
```
- **Expected Result Type:** Table (chiller, kWh 7 ngày)

---

### Q124
- **Domain:** AC.xlsx · AC-5
- **Question:** Nồng độ CO2 hiện tại tại tầng 3 tòa nhà A như thế nào?
- **Default:** Query tại CURRENT_TIMESTAMP; ngưỡng an toàn = 1000 ppm
- **Note:** Không có bảng telemetry CO2 ppm → trả thông tin sensor qua dim_device
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       da.asset_name,
       s.current_status,
       s.event_time AS last_updated
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE (d.device_type LIKE '%co2%' OR d.device_type LIKE '%CO2%')
  AND da.asset_name LIKE '%FLOOR%3%'
  AND da.asset_name LIKE '%A%'
ORDER BY d.device_name
```
- **Expected Result Type:** Table (CO2 sensor, status, floor)

---

### Q125
- **Domain:** AC.xlsx · AC-6
- **Question:** Xu hướng tiêu thụ điện khu vực B trong tuần qua?
- **Default:** "Tuần qua" = user nói rõ → 7 ngày; có "xu hướng" → series theo ngày
- **Expected SQL:**
```sql
SELECT DATE_FORMAT(e.tsDt,'%Y-%m-%d')                                    AS day,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev      ON e.deviceId = dev.device_id
JOIN sdp_golden_dim_device_asset da ON dev.device_id = da.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  AND da.asset_name LIKE '%B%'
GROUP BY DATE_FORMAT(e.tsDt,'%Y-%m-%d')
ORDER BY day
```
- **Expected Result Type:** Chart – Line (kWh/ngày)

---

### Q126
- **Domain:** AC.xlsx · AC-7
- **Question:** Xu hướng tiêu thụ nước của khu vực trong 3 tháng qua?
- **Default:** >90 ngày → grain tháng; khu vực mơ hồ → toàn hệ thống
- **Expected SQL:**
```sql
SELECT DATE_FORMAT(tsDt,'%Y-%m')                                          AS month,
       ROUND(MAX(water_volume_m3_total) - MIN(water_volume_m3_total), 3) AS water_m3
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
WHERE tsDt >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
GROUP BY DATE_FORMAT(tsDt,'%Y-%m')
ORDER BY month
```
- **Expected Result Type:** Chart – Line (m³/tháng)

---

### Q127
- **Domain:** AC.xlsx · AC-8
- **Question:** Số liệu và xu hướng tiêu thụ điện tháng trước tại khu vực C?
- **Default:** "Tháng trước" = historical; có cả "số liệu" + "xu hướng" → trả cả tổng và series tuần
- **Expected SQL:**
```sql
-- Tổng tháng trước
SELECT ROUND(SUM(daily_kwh), 3) AS total_kwh_prev_month
FROM (
  SELECT deviceId,
         DATE_FORMAT(tsDt,'%Y-%m-%d') AS day,
         MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS daily_kwh
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
  JOIN sdp_golden_dim_device dev      ON e.deviceId = dev.device_id
  JOIN sdp_golden_dim_device_asset da ON dev.device_id = da.device_id
  WHERE DATE_FORMAT(e.tsDt,'%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH),'%Y-%m')
    AND da.asset_name LIKE '%C%'
  GROUP BY deviceId, DATE_FORMAT(tsDt,'%Y-%m-%d')
) sub;

-- Series theo ngày
SELECT DATE_FORMAT(e.tsDt,'%Y-%m-%d') AS day,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev      ON e.deviceId = dev.device_id
JOIN sdp_golden_dim_device_asset da ON dev.device_id = da.device_id
WHERE DATE_FORMAT(e.tsDt,'%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH),'%Y-%m')
  AND da.asset_name LIKE '%C%'
GROUP BY DATE_FORMAT(e.tsDt,'%Y-%m-%d')
ORDER BY day
```
- **Expected Result Type:** Scalar + Chart – Line (tổng + series)

---

### Q128
- **Domain:** AC.xlsx · AC-9
- **Question:** WATER_TANK_LEVEL có giảm bất thường trong 3 ngày qua không?
- **Default:** "3 ngày" = rõ → historical; bất thường = mean ±30% so với 30 ngày trước
- **Note:** Không có bảng telemetry WATER_TANK → query trạng thái online/offline làm proxy
- **Expected SQL:**
```sql
SELECT d.device_name,
       s.current_status,
       s.event_time AS last_status_time,
       DATEDIFF(NOW(), s.event_time) AS days_since_last_update
FROM sdp_golden_dim_device d
LEFT JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE d.device_type LIKE '%WATER_TANK%'
ORDER BY d.device_name
```
- **Expected Result Type:** Table (water tank, status, days without update)

---

### Q129
- **Domain:** AC.xlsx · AC-10
- **Question:** Nhiệt độ làm lạnh CHILLER như thế nào so với tuần trước?
- **Default:** "Tuần trước" = historical; có so sánh → 2 period comparison; grain ngày
- **Expected SQL:**
```sql
SELECT 'Tuần này'  AS period, ROUND(AVG(chiller_state), 2) AS avg_chiller_state
FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller
WHERE tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
UNION ALL
SELECT 'Tuần trước', ROUND(AVG(chiller_state), 2)
FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller
WHERE tsDt >= DATE_SUB(NOW(), INTERVAL 14 DAY)
  AND tsDt <  DATE_SUB(NOW(), INTERVAL 7 DAY)
```
- **Expected Result Type:** Table (period comparison)

---

### Q130
- **Domain:** AC.xlsx · AC-11
- **Question:** Top khu vực tiêu thụ điện nhiều nhất?
- **Default:** Thiếu N → N=5; Metric → 30d rolling; không grain → tổng
- **Expected SQL:**
```sql
SELECT da.asset_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev      ON e.deviceId = dev.device_id
JOIN sdp_golden_dim_device_asset da ON dev.device_id = da.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY da.asset_name
ORDER BY consumption_kwh DESC
LIMIT 5
```
- **Expected Result Type:** Chart – Bar (top 5 khu vực, kWh)

---

### Q131
- **Domain:** AC.xlsx · AC-12
- **Question:** Top 3 khu vực tiêu thụ nước ít nhất trong tháng?
- **Default:** N=3 (user nói rõ); "tháng" mơ hồ → 30d rolling; "ít nhất" = ASC
- **Expected SQL:**
```sql
SELECT da.asset_name,
       ROUND(MAX(e.water_volume_m3_total) - MIN(e.water_volume_m3_total), 3) AS water_m3
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev      ON e.deviceId = dev.device_id
JOIN sdp_golden_dim_device_asset da ON dev.device_id = da.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY da.asset_name
ORDER BY water_m3 ASC
LIMIT 3
```
- **Expected Result Type:** Table (top 3 khu vực tiêu thụ nước ít nhất)

---

### Q132
- **Domain:** AC.xlsx · AC-13
- **Question:** Top 5 khu vực có FCU_FAN_COIL chạy nhiều nhất tháng này?
- **Default:** N=5 (user nói rõ); "tháng này" = từ đầu tháng đến nay; metric = số lần ONLINE
- **Note:** FCU không có bảng telemetry runtime → dùng status events để đếm số lần online
- **Expected SQL:**
```sql
SELECT da.asset_name,
       COUNT(s.event_id) AS online_event_count
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
JOIN sdp_staging_stg_dmp_device_status_events s ON d.device_id = s.device_id
WHERE d.device_type LIKE '%FCU%'
  AND s.current_status = 'ONLINE'
  AND s.event_type = 'STATUS_CHANGE'
  AND s.event_time >= DATE_FORMAT(NOW(),'%Y-%m-01 00:00:00')
GROUP BY da.asset_name
ORDER BY online_event_count DESC
LIMIT 5
```
- **Expected Result Type:** Table (khu vực, FCU online events tháng này)

---

### Q133
- **Domain:** AC.xlsx · AC-14
- **Question:** Thiết bị nào có số lần lỗi (offline/error event) cao nhất trong 14 ngày qua?
- **Default:** "14 ngày" = rõ → historical; Top N = 5
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       COUNT(*) AS error_event_count
FROM sdp_golden_dim_device d
JOIN sdp_staging_stg_dmp_device_status_events s ON d.device_id = s.device_id
WHERE s.current_status IN ('OFFLINE','ERROR')
  AND s.event_type = 'STATUS_CHANGE'
  AND s.event_time >= DATE_SUB(NOW(), INTERVAL 14 DAY)
GROUP BY d.device_id, d.device_name, d.device_type
ORDER BY error_event_count DESC
LIMIT 5
```
- **Expected Result Type:** Table (device, device_type, error count)

---

### Q134
- **Domain:** AC.xlsx · AC-15
- **Question:** Khu vực nào có nồng độ CO2 cao nhất hiện tại?
- **Default:** Real-time snapshot; Top N = 5
- **Note:** Không có bảng telemetry CO2 ppm → trả số lượng CO2 sensor online theo khu vực
- **Expected SQL:**
```sql
SELECT da.asset_name,
       COUNT(d.device_id)                            AS co2_sensor_count,
       SUM(CASE WHEN s.current_status = 'ONLINE' THEN 1 ELSE 0 END) AS online_count
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN (
  SELECT device_id, current_status
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE d.device_type LIKE '%co2%' OR d.device_type LIKE '%CO2%'
GROUP BY da.asset_name
ORDER BY co2_sensor_count DESC
LIMIT 5
```
- **Expected Result Type:** Table (khu vực, CO2 sensor count)

---

### Q135
- **Domain:** AC.xlsx · AC-16
- **Question:** Danh sách camera đang bị hỏng hoặc offline?
- **Default:** Real-time; "hỏng" = offline + không tín hiệu > 3 ngày
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       da.asset_name,
       s.current_status,
       s.event_time     AS last_status_time,
       DATEDIFF(NOW(), MAX(c.tsDt)) AS days_no_telemetry
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
LEFT JOIN sdp_near_realtime_stg_mv_dmp_tlm_camera c ON d.device_id = c.deviceId
WHERE d.device_type LIKE '%Camera%'
  AND (latest.current_status IN ('OFFLINE','ERROR')
    OR MAX(c.tsDt) < DATE_SUB(NOW(), INTERVAL 3 DAY)
    OR MAX(c.tsDt) IS NULL)
GROUP BY d.device_id, d.device_name, d.device_type, da.asset_name, latest.current_status, latest.event_time
ORDER BY days_no_telemetry DESC
```
- **Expected Result Type:** Table (camera, status, days offline)

---

### Q136
- **Domain:** AC.xlsx · AC-17
- **Question:** Danh sách thang máy đang bảo trì hoặc hỏng?
- **Default:** Real-time; không tín hiệu > 3 ngày = hỏng
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       da.asset_name,
       s.current_status,
       s.event_time AS last_status_time
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE (d.device_type LIKE '%elevator%' OR d.device_type LIKE '%Elevator%'
    OR d.device_type LIKE '%lift%')
  AND (latest.current_status IN ('OFFLINE','MAINTENANCE')
    OR DATEDIFF(NOW(), latest.event_time) > 3)
ORDER BY da.asset_name, d.device_name
```
- **Expected Result Type:** Table (elevator, status, location)

---

### Q137
- **Domain:** AC.xlsx · AC-18
- **Question:** Danh sách ACB_BREAKER đang bị trip hoặc lỗi?
- **Default:** Real-time snapshot; scope mơ hồ → toàn hệ thống
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       da.asset_name,
       s.current_status,
       s.event_time AS last_updated
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE (d.device_type LIKE '%ACB%' OR d.device_type LIKE '%breaker%')
  AND latest.current_status IN ('OFFLINE','ERROR')
ORDER BY da.asset_name, d.device_name
```
- **Expected Result Type:** Table (ACB, status, location)

---

### Q138
- **Domain:** AC.xlsx · AC-19
- **Question:** Tất cả thiết bị đang ở trạng thái Error hoặc Maintenance trên toàn hệ thống?
- **Default:** Real-time; toàn hệ thống (không phân biệt loại)
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       da.asset_name,
       s.current_status,
       s.event_time AS last_status_time
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
INNER JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE latest.current_status IN ('ERROR','MAINTENANCE','OFFLINE')
ORDER BY d.device_type, da.asset_name
```
- **Expected Result Type:** Table (device, type, status, location)

---

### Q139
- **Domain:** AC.xlsx · AC-20
- **Question:** Face Terminal nào đang ở chế độ bảo trì?
- **Default:** Real-time; phân biệt MAINTENANCE vs ERROR
- **Expected SQL:**
```sql
SELECT d.device_name,
       d.device_type,
       da.asset_name,
       s.current_status,
       s.event_time AS maintenance_since
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
INNER JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE (d.device_type LIKE '%face%' OR d.device_type LIKE '%Face%'
    OR d.device_type LIKE '%terminal%')
  AND latest.current_status = 'MAINTENANCE'
ORDER BY da.asset_name
```
- **Expected Result Type:** Table (Face Terminal, maintenance since, location)

---

### Q140
- **Domain:** AC.xlsx · AC-21
- **Question:** CO2_SENSOR tại khu vực A có vượt ngưỡng an toàn (1000 ppm) không?
- **Default:** Real-time; ngưỡng CO2 = 1000 ppm; trả cả giá trị và verdict
- **Note:** Không có bảng telemetry CO2 ppm → trả thông tin sensor + trạng thái thiết bị
- **Expected SQL:**
```sql
SELECT d.device_name,
       da.asset_name,
       s.current_status,
       s.event_time AS last_seen,
       CASE WHEN s.current_status != 'ONLINE' THEN 'Không thể đọc dữ liệu'
            ELSE 'Online — cần xem raw telemetry để xác định ppm'
       END AS co2_verdict
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE (d.device_type LIKE '%co2%' OR d.device_type LIKE '%CO2%')
  AND da.asset_name LIKE '%A%'
ORDER BY d.device_name
```
- **Expected Result Type:** Table (CO2 sensor, khu vực, trạng thái)

---

### Q141
- **Domain:** AC.xlsx · AC-22
- **Question:** Danh sách CO2_SENSOR có giá trị > 1000 ppm hiện tại?
- **Default:** Real-time; filter theo ngưỡng tuyệt đối
- **Note:** Không có bảng telemetry CO2 ppm → query device có device_type CO2 đang online
- **Expected SQL:**
```sql
SELECT d.device_name,
       da.asset_name,
       s.current_status,
       s.event_time AS last_seen
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
INNER JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE (d.device_type LIKE '%co2%' OR d.device_type LIKE '%CO2%')
  AND latest.current_status = 'ONLINE'
ORDER BY da.asset_name, d.device_name
```
- **Expected Result Type:** Table (CO2 sensor, location — ppm unavailable in current DB)

---

### Q142
- **Domain:** AC.xlsx · AC-23
- **Question:** Camera nào có chất lượng hình ảnh kém (low light / noise)?
- **Default:** Real-time; SNR < 30 dB hoặc CPU cao > 70% làm proxy
- **Expected SQL:**
```sql
SELECT d.device_name,
       da.asset_name,
       c.cpu_usage_pct,
       c.memory_used_mb,
       c.memory_free_mb,
       c.tsDt AS last_telemetry
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d        ON c.deviceId = d.device_id
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
  GROUP BY deviceId
) x ON c.deviceId = x.deviceId AND c.tsDt = x.latest
WHERE c.cpu_usage_pct > 70
ORDER BY c.cpu_usage_pct DESC
```
- **Expected Result Type:** Table (camera, cpu%, memory, location)

---

### Q143
- **Domain:** AC.xlsx · AC-24
- **Question:** Camera nào có RAM usage cao hơn 70%?
- **Default:** Real-time; ngưỡng "cao" = >70%
- **Expected SQL:**
```sql
SELECT d.device_name,
       da.asset_name,
       c.memory_used_mb,
       c.memory_free_mb,
       ROUND(100.0 * c.memory_used_mb / (c.memory_used_mb + c.memory_free_mb), 1) AS ram_usage_pct
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d        ON c.deviceId = d.device_id
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
INNER JOIN (
  SELECT deviceId, MAX(tsDt) AS latest
  FROM sdp_near_realtime_stg_mv_dmp_tlm_camera
  GROUP BY deviceId
) x ON c.deviceId = x.deviceId AND c.tsDt = x.latest
HAVING ram_usage_pct > 70
ORDER BY ram_usage_pct DESC
```
- **Expected Result Type:** Table (camera, RAM%)

---

### Q144
- **Domain:** AC.xlsx · AC-25
- **Question:** Tỷ lệ uptime của toàn bộ camera Hikvision trong tháng?
- **Default:** "Tháng" mơ hồ → 30d rolling; uptime ≥95%=Tốt / 80–95%=Theo dõi / <80%=Thấp
- **Expected SQL:**
```sql
SELECT d.device_name,
       da.asset_name,
       COUNT(c.tsDt)                                      AS records_sent,
       MIN(c.tsDt)                                        AS first_seen,
       MAX(c.tsDt)                                        AS last_seen,
       ROUND(
         100.0 * COUNT(c.tsDt)
         / TIMESTAMPDIFF(HOUR, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW()),
         1
       )                                                  AS approx_uptime_pct,
       CASE
         WHEN ROUND(100.0 * COUNT(c.tsDt) / TIMESTAMPDIFF(HOUR, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW()), 1) >= 95 THEN 'Tốt'
         WHEN ROUND(100.0 * COUNT(c.tsDt) / TIMESTAMPDIFF(HOUR, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW()), 1) >= 80 THEN 'Cần theo dõi'
         ELSE 'Thấp'
       END                                                AS uptime_verdict
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN sdp_near_realtime_stg_mv_dmp_tlm_camera c ON d.device_id = c.deviceId
  AND c.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
WHERE d.device_type LIKE '%Camera%'
GROUP BY d.device_id, d.device_name, da.asset_name
ORDER BY approx_uptime_pct ASC
```
- **Expected Result Type:** Table (camera, uptime%, verdict)

---

### Q145
- **Domain:** AC.xlsx · AC-26 · Multi-turn
- **Question:** [Sau câu hỏi về CO2 tầng 3] Còn tầng 5 thì sao?
- **Context:** Kế thừa tòa nhà và loại sensor từ lượt trước (context từ Q124)
- **Expected SQL:**
```sql
-- Tương tự Q124 nhưng đổi floor 3 → floor 5
SELECT d.device_name,
       d.device_type,
       da.asset_name,
       s.current_status,
       s.event_time AS last_updated
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
LEFT JOIN (
  SELECT device_id, current_status, event_time
  FROM sdp_staging_stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS max_evt
    FROM sdp_staging_stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) lx ON s.device_id = lx.device_id AND s.event_time = lx.max_evt
) latest ON d.device_id = latest.device_id
WHERE (d.device_type LIKE '%co2%' OR d.device_type LIKE '%CO2%')
  AND da.asset_name LIKE '%FLOOR%5%'
  AND da.asset_name LIKE '%A%'   -- tòa nhà A từ context
ORDER BY d.device_name
```
- **Expected Result Type:** Table (CO2 sensor tầng 5) · Kiểm tra: AI phải tự inject context tòa nhà

---

### Q146
- **Domain:** AC.xlsx · AC-27 · Multi-turn
- **Question:** [Sau câu hỏi về top điện] Còn top nước thì sao?
- **Context:** Kế thừa N=5 và time period từ câu trước (context từ Q130)
- **Expected SQL:**
```sql
-- Kế thừa N=5, 30 ngày từ context Q130
SELECT da.asset_name,
       ROUND(MAX(e.water_volume_m3_total) - MIN(e.water_volume_m3_total), 3) AS water_m3
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev      ON e.deviceId = dev.device_id
JOIN sdp_golden_dim_device_asset da ON dev.device_id = da.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)  -- kế thừa từ context
GROUP BY da.asset_name
ORDER BY water_m3 DESC
LIMIT 5  -- kế thừa N=5 từ context
```
- **Expected Result Type:** Table (top 5 khu vực nước) · Kiểm tra: AI phải giữ N và period

---

### Q147
- **Domain:** AC.xlsx · AC-28 · Multi-turn Context Overflow
- **Question:** [Sau 5+ lượt] Quay lại câu đầu tiên về điện, kết quả có thay đổi không?
- **Context:** Context window 5 lượt → câu đầu có thể bị drop
- **Expected Result:** AI fallback về default M-08 hoặc yêu cầu user nhắc lại câu hỏi gốc
- **Expected SQL:**
```sql
-- Nếu AI nhớ được: tái sử dụng SQL của lượt đầu (Q120)
-- Nếu context bị drop: fallback về default 30d rolling
SELECT da.asset_name,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device dev      ON e.deviceId = dev.device_id
JOIN sdp_golden_dim_device_asset da ON dev.device_id = da.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND da.asset_name LIKE '%A%'
GROUP BY da.asset_name
```
- **Expected Result Type:** Test context retention — AI phải thông báo rõ nếu không nhớ được

---

### Q148
- **Domain:** AC.xlsx · AC-29 · Out-of-scope
- **Question:** Tình hình thời tiết Hà Nội hôm nay như thế nào?
- **Expected SQL:** — Không sinh SQL —
- **Expected Result:** AI từ chối khéo: *"Tôi chỉ hỗ trợ truy vấn dữ liệu Smart City tại hệ thống. Vui lòng hỏi về điện, nước, thiết bị, bãi đỗ xe hoặc các chỉ số ISO 37122."*
- **Expected Result Type:** Text fallback (không có SQL) · Kiểm tra: AI không được sinh SQL sai domain

---

### Q149
- **Domain:** AC.xlsx · AC-30 · Error Handling
- **Question:** *(Gửi câu hỏi rỗng hoặc chỉ có khoảng trắng)*
- **Expected SQL:** — Không gọi LLM —
- **Expected Result:** Validation error: *"Vui lòng nhập câu hỏi trước khi gửi."* hoặc xử lý graceful
- **Expected Result Type:** Error message · Kiểm tra: Hệ thống không crash khi input rỗng

---

## DOMAIN 9 — DASHBOARD WIDGET DRILL-DOWN (Q150–Q170)

*(Câu hỏi đào sâu từng widget trên ESG Smart City Dashboard — http://74.48.140.178:27668/home)*

> **Mapping widget → câu hỏi:**  
> K1 → Q150–Q151 · K2 → Q152 · K3 → Q153  
> E1 → Q154 · E2 → Q155–Q156 · E3 → Q157 · E4 → Q158  
> S1+S5 → Q159 · S3 → Q160 · S4 → Q161  
> G2 → Q162 · G3 → Q163 · G5 → Q164  
> O1 → Q165 · O2 → Q166 · O3 → Q167 · O4 → Q168–Q170

---

### Q150
- **Domain:** Dashboard · K1 — EV Penetration Rate
- **Widget:** K1 (KPI Card) — giá trị dashboard: 19.3%
- **Question:** Tỷ lệ phương tiện điện (EV) trong tổng giao dịch có xác định loại xe là bao nhiêu %?
- **Expected SQL:**
```sql
SELECT ROUND(
    100.0 * COUNT(CASE WHEN vehicle_type IN ('eCar','eBicycle','eMotorbike') THEN 1 END)
    / NULLIF(COUNT(CASE WHEN vehicle_type IS NOT NULL AND vehicle_type != '' THEN 1 END), 0),
    1
) AS ev_penetration_pct,
COUNT(CASE WHEN vehicle_type IN ('eCar','eBicycle','eMotorbike') THEN 1 END) AS ev_count,
COUNT(CASE WHEN vehicle_type IS NOT NULL AND vehicle_type != '' THEN 1 END) AS known_type_count
FROM sdp_golden_fct_vehicle_events
WHERE history_state = 'COMPLETED'
```
- **Expected Result Type:** Scalar / Single Row

---

### Q151
- **Domain:** Dashboard · K1 Trend
- **Widget:** K1 (EV Penetration) — xu hướng qua thời gian
- **Question:** Xu hướng tỷ lệ xe điện (EV Penetration) theo từng tháng trong năm nay?
- **Expected SQL:**
```sql
SELECT d.year_month,
       COUNT(CASE WHEN e.vehicle_type IN ('eCar','eBicycle','eMotorbike') THEN 1 END) AS ev_count,
       COUNT(CASE WHEN e.vehicle_type IS NOT NULL AND e.vehicle_type != '' THEN 1 END) AS known_count,
       ROUND(
           100.0 * COUNT(CASE WHEN e.vehicle_type IN ('eCar','eBicycle','eMotorbike') THEN 1 END)
           / NULLIF(COUNT(CASE WHEN e.vehicle_type IS NOT NULL AND e.vehicle_type != '' THEN 1 END), 0),
           1
       ) AS ev_pct
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND d.year = YEAR(NOW())
GROUP BY d.year_month
ORDER BY d.year_month
```
- **Expected Result Type:** Table / Line Chart

---

### Q152
- **Domain:** Dashboard · K2 — Digital Payment Adoption
- **Widget:** K2 (KPI Card) — giá trị dashboard: 99.1%
- **Question:** Tỷ lệ thanh toán số (không dùng tiền mặt CASH) trong tổng số giao dịch là bao nhiêu %?
- **Expected SQL:**
```sql
SELECT ROUND(
    100.0 * COUNT(CASE WHEN payment_type != 'CASH' AND payment_type IS NOT NULL THEN 1 END)
    / NULLIF(COUNT(*), 0),
    1
) AS digital_payment_pct,
COUNT(CASE WHEN payment_type != 'CASH' AND payment_type IS NOT NULL THEN 1 END) AS digital_count,
COUNT(*) AS total_count
FROM sdp_golden_fct_vehicle_events
WHERE history_state = 'COMPLETED'
```
- **Expected Result Type:** Scalar / Single Row

---

### Q153
- **Domain:** Dashboard · K3 — Total Energy Consumed
- **Widget:** K3 (KPI Card) — giá trị dashboard: 744,300 kWh qua 36 smart meter trong 3 ngày
- **Question:** Tổng tiêu thụ điện qua tất cả smart meter trong 3 ngày gần nhất và số lượng meter đang báo cáo?
- **Expected SQL:**
```sql
SELECT COUNT(DISTINCT deviceId) AS active_meter_count,
       ROUND(SUM(period_kwh), 1) AS total_kwh_3days
FROM (
  SELECT deviceId,
         MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS period_kwh
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE tsDt >= DATE_SUB(NOW(), INTERVAL 3 DAY)
  GROUP BY deviceId
) sub
```
- **Expected Result Type:** Scalar / Single Row

---

### Q154
- **Domain:** Dashboard · E1 — Daily Energy & Water Consumption
- **Widget:** E1 (Dual-axis line chart) — tiêu thụ điện kWh và nước m³ theo ngày
- **Question:** Tiêu thụ điện (kWh) và nước (m³) toàn hệ thống mỗi ngày trong tháng này?
- **Expected SQL:**
```sql
SELECT sub.day,
       ROUND(SUM(sub.daily_kwh), 3) AS total_kwh,
       ROUND(SUM(sub.daily_m3), 3)  AS total_water_m3
FROM (
  SELECT deviceId,
         DATE_FORMAT(tsDt, '%Y-%m-%d') AS day,
         MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS daily_kwh,
         MAX(water_volume_m3_total)   - MIN(water_volume_m3_total)   AS daily_m3
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE DATE_FORMAT(tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
  GROUP BY deviceId, DATE_FORMAT(tsDt, '%Y-%m-%d')
) sub
GROUP BY sub.day
ORDER BY sub.day
```
- **Expected Result Type:** Table / Dual-axis Line Chart

---

### Q155
- **Domain:** Dashboard · E2 — Hourly Power Demand Profile
- **Widget:** E2 (Area chart) — profile công suất peak/avg/min theo giờ trong 5 ngày
- **Question:** Profile công suất điện (peak kW, trung bình kW, thấp nhất kW) theo từng giờ trong ngày qua 5 ngày gần nhất?
- **Expected SQL:**
```sql
SELECT HOUR(tsDt) AS hour_of_day,
       ROUND(MAX(power_active_kw), 2) AS peak_kw,
       ROUND(AVG(power_active_kw), 2) AS avg_kw,
       ROUND(MIN(power_active_kw), 2) AS min_kw
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
WHERE tsDt >= DATE_SUB(NOW(), INTERVAL 5 DAY)
GROUP BY HOUR(tsDt)
ORDER BY HOUR(tsDt)
```
- **Expected Result Type:** Table / Area Chart

---

### Q156
- **Domain:** Dashboard · E2 — Peak Hour
- **Widget:** E2 (Hourly Power Demand) — giờ có công suất điện trung bình cao nhất
- **Question:** Giờ nào trong ngày có công suất điện trung bình cao nhất (dựa trên 30 ngày qua)?
- **Expected SQL:**
```sql
SELECT HOUR(tsDt) AS hour_of_day,
       ROUND(AVG(power_active_kw), 2) AS avg_kw,
       ROUND(MAX(power_active_kw), 2) AS peak_kw
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
WHERE tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY HOUR(tsDt)
ORDER BY avg_kw DESC
LIMIT 5
```
- **Expected Result Type:** Table / Bar Chart

---

### Q157
- **Domain:** Dashboard · E3 — Power Factor & Consumption by Device
- **Widget:** E3 (Data table ~36 hàng) — power factor và kWh từng smart meter
- **Question:** Power factor trung bình, thấp nhất và tổng kWh tiêu thụ trong 3 ngày của từng smart meter?
- **Expected SQL:**
```sql
SELECT e.deviceId,
       d.device_name,
       ROUND(AVG(e.power_factor), 3)      AS avg_power_factor,
       ROUND(MIN(e.power_factor), 3)      AS min_power_factor,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 1) AS total_kwh_3d,
       ROUND(MAX(e.water_volume_m3_total)  - MIN(e.water_volume_m3_total), 1)   AS total_water_m3_3d
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 3 DAY)
GROUP BY e.deviceId, d.device_name
ORDER BY avg_power_factor ASC
```
- **Expected Result Type:** Table

---

### Q158
- **Domain:** Dashboard · E4 — Vehicle Type Distribution
- **Widget:** E4 (Pie chart) — phân bố loại xe theo số giao dịch
- **Question:** Phân bố loại xe theo số lượng giao dịch và tỷ lệ % trong toàn bộ dữ liệu?
- **Expected SQL:**
```sql
SELECT e.vehicle_type,
       COUNT(*) AS transaction_count,
       ROUND(100.0 * COUNT(*) / t.total, 2) AS pct
FROM sdp_golden_fct_vehicle_events e
CROSS JOIN (
  SELECT COUNT(*) AS total
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
) t
WHERE e.history_state = 'COMPLETED'
GROUP BY e.vehicle_type, t.total
ORDER BY transaction_count DESC
```
- **Expected Result Type:** Table / Pie Chart

---

### Q159
- **Domain:** Dashboard · S1 + S5 — Payment Channel (Transactions vs Revenue)
- **Widget:** S1 (donut — số giao dịch) + S5 (donut — doanh thu)
- **Question:** So sánh kênh thanh toán theo cả hai chiều: số giao dịch (%) và doanh thu (%)?
- **Expected SQL:**
```sql
SELECT e.payment_type,
       COUNT(*) AS transactions,
       ROUND(100.0 * COUNT(*) / tc.total_tx, 2) AS tx_pct,
       ROUND(SUM(e.amount_due), 0) AS revenue_vnd,
       ROUND(100.0 * SUM(e.amount_due) / tr.total_rev, 2) AS rev_pct
FROM sdp_golden_fct_vehicle_events e
CROSS JOIN (
  SELECT COUNT(*) AS total_tx
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
) tc
CROSS JOIN (
  SELECT SUM(amount_due) AS total_rev
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
) tr
WHERE e.history_state = 'COMPLETED'
GROUP BY e.payment_type, tc.total_tx, tr.total_rev
ORDER BY transactions DESC
```
- **Expected Result Type:** Table

---

### Q160
- **Domain:** Dashboard · S3 — EV Penetration by Location
- **Widget:** S3 (Horizontal stacked bar) — EV vs ICE theo từng bãi đỗ
- **Question:** Tỷ lệ xe điện (EV) và xe xăng (ICE) tại từng bãi đỗ trong 30 ngày qua?
- **Expected SQL:**
```sql
SELECT l.pk_lot_name,
       l.area_id,
       COUNT(*) AS total_transactions,
       COUNT(CASE WHEN e.vehicle_type IN ('eCar','eBicycle','eMotorbike') THEN 1 END) AS ev_count,
       COUNT(CASE WHEN e.vehicle_type NOT IN ('eCar','eBicycle','eMotorbike') AND e.vehicle_type IS NOT NULL THEN 1 END) AS ice_count,
       ROUND(
           100.0 * COUNT(CASE WHEN e.vehicle_type IN ('eCar','eBicycle','eMotorbike') THEN 1 END)
           / NULLIF(COUNT(CASE WHEN e.vehicle_type IS NOT NULL THEN 1 END), 0),
           1
       ) AS ev_pct
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y%m%d') AS INT)
GROUP BY l.pk_lot_name, l.area_id
ORDER BY ev_pct DESC
```
- **Expected Result Type:** Table / Stacked Bar Chart

---

### Q161
- **Domain:** Dashboard · S4 — Hourly Parking Demand
- **Widget:** S4 (Grouped bar chart) — lượt xe vào theo giờ và khu vực
- **Question:** Số lượt xe vào theo từng giờ trong ngày phân theo khu vực bãi đỗ (area)?
- **Expected SQL:**
```sql
SELECT HOUR(o.occupancy_hour) AS hour_of_day,
       l.area_id,
       SUM(o.vehicles_in) AS vehicles_entered
FROM sdp_mart_fct_parking_occupancy o
JOIN sdp_golden_dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
GROUP BY HOUR(o.occupancy_hour), l.area_id
ORDER BY hour_of_day, vehicles_entered DESC
```
- **Expected Result Type:** Table / Grouped Bar Chart

---

### Q162
- **Domain:** Dashboard · G2 — Parking Lot Utilization by Org
- **Widget:** G2 (Horizontal bar) — số xe đỗ hiện tại theo bãi và khu vực
- **Question:** Số xe đang đỗ tại từng bãi phân nhóm theo khu vực (area) tại thời điểm hiện tại?
- **Expected SQL:**
```sql
SELECT l.area_id,
       l.pk_lot_name,
       SUM(o.current_occupancy) AS current_vehicles
FROM sdp_mart_fct_parking_occupancy o
JOIN sdp_golden_dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
WHERE o.occupancy_hour = (SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy)
GROUP BY l.area_id, l.pk_lot_name
ORDER BY l.area_id, current_vehicles DESC
```
- **Expected Result Type:** Table / Horizontal Bar Chart

---

### Q163
- **Domain:** Dashboard · G3 — Smart Meter Deployment
- **Widget:** G3 (Data table ~36 hàng) — chỉ số odometer và tiêu thụ từng meter
- **Question:** Danh sách smart meter với chỉ số tích lũy hiện tại (kWh odometer) và lượng tiêu thụ trong 3 ngày gần nhất?
- **Expected SQL:**
```sql
SELECT e.deviceId,
       d.device_name,
       ROUND(recent.latest_kwh, 1)     AS odometer_kwh,
       ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 1) AS consumed_3d_kwh,
       ROUND(MAX(e.water_volume_m3_total)  - MIN(e.water_volume_m3_total), 1)   AS water_3d_m3,
       recent.latest_ts AS last_reading
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
JOIN (
  SELECT deviceId,
         MAX(energy_active_kwh_total) AS latest_kwh,
         MAX(tsDt) AS latest_ts
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  GROUP BY deviceId
) recent ON e.deviceId = recent.deviceId
WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 3 DAY)
GROUP BY e.deviceId, d.device_name, recent.latest_kwh, recent.latest_ts
ORDER BY consumed_3d_kwh DESC
```
- **Expected Result Type:** Table

---

### Q164
- **Domain:** Dashboard · G5 — IoT Data Freshness
- **Widget:** G5 (Data table dài) — độ tươi dữ liệu từng thiết bị
- **Question:** Thiết bị IoT nào gửi bản ghi gần nhất cách đây lâu nhất (dữ liệu cũ nhất — top 20)?
- **Expected SQL:**
```sql
SELECT d.device_id,
       d.device_name,
       d.device_type,
       MAX(s.event_time) AS last_seen_time,
       TIMESTAMPDIFF(HOUR, MAX(s.event_time), NOW()) AS hours_stale
FROM sdp_golden_dim_device d
LEFT JOIN sdp_staging_stg_dmp_device_status_events s ON d.device_id = s.device_id
  AND s.event_type = 'STATUS_CHANGE'
GROUP BY d.device_id, d.device_name, d.device_type
ORDER BY hours_stale DESC
LIMIT 20
```
- **Expected Result Type:** Table

---

### Q165
- **Domain:** Dashboard · O1 — Estimate Concurrent Occupancy by Lot
- **Widget:** O1 (Line chart, full width) — số xe đỗ đồng thời theo thời gian từng bãi
- **Question:** Số xe đỗ đồng thời tại từng bãi theo từng giờ trong 30 ngày qua?
- **Expected SQL:**
```sql
SELECT l.pk_lot_name,
       DATE_FORMAT(o.occupancy_hour, '%Y-%m-%d %H:00') AS hour_slot,
       SUM(o.current_occupancy) AS concurrent_occupancy
FROM sdp_mart_fct_parking_occupancy o
JOIN sdp_golden_dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
WHERE o.occupancy_date >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y-%m-%d')
GROUP BY l.pk_lot_name, DATE_FORMAT(o.occupancy_hour, '%Y-%m-%d %H:00')
ORDER BY l.pk_lot_name, hour_slot
```
- **Expected Result Type:** Table / Multi-line Chart

---

### Q166
- **Domain:** Dashboard · O2 — Average Dwell Time by Lot & Vehicle Type
- **Widget:** O2 (Horizontal bar) — dwell time trung bình theo bãi và loại xe
- **Question:** Thời gian đỗ xe trung bình tại từng bãi phân theo loại xe trong 30 ngày qua?
- **Expected SQL:**
```sql
SELECT l.pk_lot_name,
       e.vehicle_type,
       ROUND(AVG(e.park_duration_ms) / 60000.0, 1) AS avg_dwell_minutes,
       COUNT(*) AS transactions
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
WHERE e.history_state = 'COMPLETED'
  AND e.park_duration_ms IS NOT NULL
  AND e.check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y%m%d') AS INT)
GROUP BY l.pk_lot_name, e.vehicle_type
ORDER BY l.pk_lot_name, avg_dwell_minutes DESC
```
- **Expected Result Type:** Table / Horizontal Bar Chart

---

### Q167
- **Domain:** Dashboard · O3 — Daily Vehicle Turnover by Lot
- **Widget:** O3 (Line chart) — số lượt xe hoàn tất mỗi ngày theo từng bãi
- **Question:** Số lượt xe hoàn tất (turnover) mỗi ngày tại từng bãi trong 30 ngày qua?
- **Expected SQL:**
```sql
SELECT l.pk_lot_name,
       d.full_date AS date,
       COUNT(*) AS daily_turnover
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y%m%d') AS INT)
GROUP BY l.pk_lot_name, d.full_date
ORDER BY l.pk_lot_name, d.full_date
```
- **Expected Result Type:** Table / Multi-line Chart

---

### Q168
- **Domain:** Dashboard · O4 — Entry Rate by Hour (IN)
- **Widget:** O4 (Stacked column) — lượt xe VÀO theo giờ
- **Question:** Tổng số xe vào (IN) theo từng giờ trong ngày tính trên toàn bộ dữ liệu lịch sử?
- **Expected SQL:**
```sql
SELECT HOUR(o.occupancy_hour) AS hour_of_day,
       SUM(o.vehicles_in) AS total_entries
FROM sdp_mart_fct_parking_occupancy o
GROUP BY HOUR(o.occupancy_hour)
ORDER BY hour_of_day
```
- **Expected Result Type:** Table / Bar Chart

---

### Q169
- **Domain:** Dashboard · O4 — Exit Rate by Hour (OUT)
- **Widget:** O4 (Stacked column) — lượt xe RA theo giờ
- **Question:** Tổng số xe ra (OUT/check-out) theo từng giờ trong ngày tính trên toàn bộ dữ liệu lịch sử?
- **Expected SQL:**
```sql
SELECT HOUR(e.check_out_at) AS hour_of_day,
       COUNT(*) AS total_exits
FROM sdp_golden_fct_vehicle_events e
WHERE e.history_state = 'COMPLETED'
  AND e.check_out_at IS NOT NULL
GROUP BY HOUR(e.check_out_at)
ORDER BY hour_of_day
```
- **Expected Result Type:** Table / Bar Chart

---

### Q170
- **Domain:** Dashboard · O4 — Entry vs Exit by Hour (combined)
- **Widget:** O4 (Stacked column, full width) — IN vs OUT đồng thời theo giờ 0–23
- **Question:** So sánh lượt xe vào (IN) và xe ra (OUT) theo từng giờ trong ngày (0–23)?
- **Expected SQL:**
```sql
SELECT h.hour_of_day,
       COALESCE(entries.total_in, 0)  AS total_in,
       COALESCE(exits.total_out, 0)   AS total_out,
       COALESCE(entries.total_in, 0) - COALESCE(exits.total_out, 0) AS net_flow
FROM (
  SELECT DISTINCT HOUR(occupancy_hour) AS hour_of_day
  FROM sdp_mart_fct_parking_occupancy
) h
LEFT JOIN (
  SELECT HOUR(occupancy_hour) AS hr,
         SUM(vehicles_in) AS total_in
  FROM sdp_mart_fct_parking_occupancy
  GROUP BY HOUR(occupancy_hour)
) entries ON h.hour_of_day = entries.hr
LEFT JOIN (
  SELECT HOUR(check_out_at) AS hr,
         COUNT(*) AS total_out
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_out_at IS NOT NULL
  GROUP BY HOUR(check_out_at)
) exits ON h.hour_of_day = exits.hr
ORDER BY h.hour_of_day
```
- **Expected Result Type:** Table / Stacked Column Chart
