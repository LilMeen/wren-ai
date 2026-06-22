# Question Test

File kiểm thử Wren AI: mỗi test case gồm **Question** (câu hỏi), **Expected Result** (kết quả mong đợi), và **Expected SQL** (SQL đúng).

Trạng thái: `[ ]` chưa test · `[✅]` pass · `[❌]` fail · `[⚠]` SQL đúng nhưng kết quả lệch data

---

## Domain: Parking — Revenue

### T-PRK-01
- **Status:** `✅`
- **Question:** Tổng doanh thu hôm nay là bao nhiêu?
- **Expected Result:** Một số dương (VND), ví dụ `1,250,000`
- **Expected SQL:**
  ```sql
  SELECT SUM(amount_due) AS revenue_vnd
  FROM sdp_golden.fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_in_date_key = CAST(DATE_FORMAT(NOW(), '%Y%m%d') AS INT)
  ```
- **Trap:** AI không được dùng `parking_fee` thay `amount_due`; phải có filter `history_state = 'COMPLETED'`

---

### T-PRK-02
- **Status:** `✅`
- **Question:** Doanh thu theo từng tháng trong năm 2026
- **Expected Result:** Bảng 12 hàng: `year_month | revenue_vnd` sắp xếp theo tháng
- **Expected SQL:**
  ```sql
  SELECT d.year_month,
         SUM(e.amount_due) AS revenue_vnd,
         COUNT(*) AS transactions
  FROM sdp_golden.fct_vehicle_events e
  JOIN sdp_golden.dim_date d ON e.check_in_date_key = d.date_key
  WHERE e.history_state = 'COMPLETED'
    AND d.year = 2026
  GROUP BY d.year_month
  ORDER BY d.year_month
  ```

---

### T-PRK-03
- **Status:** `✅`
- **Question:** Bãi xe nào có doanh thu cao nhất?
- **Expected Result:** Một hàng: `parking_lot_id | pk_lot_name | revenue_vnd`
- **Expected SQL:**
  ```sql
  SELECT e.parking_lot_id, l.pk_lot_name, l.area_id,
         SUM(e.amount_due) AS revenue_vnd
  FROM sdp_golden.fct_vehicle_events e
  JOIN sdp_golden.dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
  WHERE e.history_state = 'COMPLETED'
  GROUP BY e.parking_lot_id, l.pk_lot_name, l.area_id
  ORDER BY revenue_vnd DESC
  LIMIT 1
  ```

---

### T-PRK-04
- **Status:** `✅`
- **Question:** So sánh doanh thu giữa xe CAR và MOTORBIKE
- **Expected Result:** 2 hàng: `vehicle_type | revenue_vnd | transactions`
- **Expected SQL:**
  ```sql
  SELECT vehicle_type,
         SUM(amount_due) AS revenue_vnd,
         COUNT(*) AS transactions
  FROM sdp_golden.fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND vehicle_type IN ('CAR', 'MOTORBIKE')
  GROUP BY vehicle_type
  ```
- **Trap:** AI phải biết giá trị là `'CAR'` và `'MOTORBIKE'` (uppercase)

---

### T-PRK-05
- **Status:** `✅`
- **Question:** Tỉ lệ phần trăm từng phương thức thanh toán
- **Expected Result:** 4 hàng: `payment_type | transactions | pct`
- **Expected SQL:**
  ```sql
  SELECT payment_type,
         COUNT(*) AS transactions,
         ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS pct
  FROM sdp_golden.fct_vehicle_events
  WHERE history_state = 'COMPLETED'
  GROUP BY payment_type
  ORDER BY transactions DESC
  ```

---

### T-PRK-06
- **Status:** `✅`
- **Question:** Doanh thu cuối tuần cao hơn ngày thường bao nhiêu %?
- **Expected Result:** 2 hàng: `is_weekend | revenue_vnd` hoặc 1 hàng tỉ lệ
- **Expected SQL:**
  ```sql
  SELECT d.is_weekend,
         SUM(e.amount_due) AS revenue_vnd,
         COUNT(*) AS transactions
  FROM sdp_golden.fct_vehicle_events e
  JOIN sdp_golden.dim_date d ON e.check_in_date_key = d.date_key
  WHERE e.history_state = 'COMPLETED'
  GROUP BY d.is_weekend
  ```

---

## Domain: Parking — Occupancy

### T-PRK-07
- **Status:** `✅`
- **Question:** Hiện có bao nhiêu xe đang đỗ tại từng bãi?
- **Expected Result:** Nhiều hàng: `parking_lot_id | vehicles_parked`
- **Expected SQL:**
  ```sql
  SELECT o.parking_lot_id, l.pk_lot_name,
         SUM(o.current_occupancy) AS vehicles_parked
  FROM sdp_golden.fct_parking_occupancy o
  JOIN sdp_golden.dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
  WHERE o.occupancy_hour = (
    SELECT MAX(occupancy_hour) FROM sdp_golden.fct_parking_occupancy
  )
  GROUP BY o.parking_lot_id, l.pk_lot_name
  ORDER BY vehicles_parked DESC
  ```
- **Trap:** AI KHÔNG được tự tính từ `fct_vehicle_events`; phải dùng `fct_parking_occupancy`

---

### T-PRK-08
- **Status:** `✅`
- **Question:** Giờ cao điểm đỗ xe trong ngày hôm nay là mấy giờ?
- **Expected Result:** Top 3–5 hàng: `hour | total_vehicles`
- **Expected SQL:**
  ```sql
  SELECT t.hour, t.hour_label,
         SUM(o.current_occupancy) AS total_vehicles
  FROM sdp_golden.fct_parking_occupancy o
  JOIN sdp_golden.dim_time t ON o.occupancy_time_key = t.time_key
  WHERE o.occupancy_date = DATE_FORMAT(NOW(), '%Y-%m-%d')
  GROUP BY t.hour, t.hour_label
  ORDER BY total_vehicles DESC
  LIMIT 5
  ```

---

### T-PRK-09
- **Status:** `✅`
- **Question:** Khu vực nào đang có nhiều xe đỗ nhất?
- **Expected Result:** Hàng đầu: `area_id | vehicles_parked`
- **Expected SQL:**
  ```sql
  SELECT l.area_id, SUM(o.current_occupancy) AS vehicles_parked
  FROM sdp_golden.fct_parking_occupancy o
  JOIN sdp_golden.dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
  WHERE o.occupancy_hour = (
    SELECT MAX(occupancy_hour) FROM sdp_golden.fct_parking_occupancy
  )
  GROUP BY l.area_id
  ORDER BY vehicles_parked DESC
  LIMIT 1
  ```

---

## Domain: Parking — Dwell Time & Lane

### T-PRK-10
- **Status:** `✅`
- **Question:** Thời gian đỗ xe trung bình là bao nhiêu phút?
- **Expected Result:** Một số, ví dụ `87.3` phút
- **Expected SQL:**
  ```sql
  SELECT ROUND(AVG(park_duration_ms / 60000.0), 1) AS avg_minutes
  FROM sdp_golden.fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_out_at IS NOT NULL
  ```
- **Trap:** Phải chia `60000` (không phải 60); phải loại `check_out_at IS NULL`

---

### T-PRK-11
- **Status:** `✅`
- **Question:** Xe tải (TRUCK) đỗ lâu hơn xe máy bao nhiêu phút?
- **Expected Result:** 2 hàng: `vehicle_type | avg_minutes`
- **Expected SQL:**
  ```sql
  SELECT vehicle_type,
         ROUND(AVG(park_duration_ms / 60000.0), 1) AS avg_minutes
  FROM sdp_golden.fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_out_at IS NOT NULL
    AND vehicle_type IN ('TRUCK', 'MOTORBIKE')
  GROUP BY vehicle_type
  ```

---

### T-PRK-12
- **Status:** `⚠`
- **Question:** Làn vào nào bận nhất tuần này?
- **Expected Result:** Hàng đầu: `lane_in_name | transactions`
- **Expected SQL:**
  ```sql
  SELECT e.lane_in_name, COUNT(*) AS transactions
  FROM sdp_golden.fct_vehicle_events e
  JOIN sdp_golden.dim_date d ON e.check_in_date_key = d.date_key
  WHERE e.history_state = 'COMPLETED'
    AND d.year_week = DATE_FORMAT(NOW(), '%Y-W%v')
  GROUP BY e.lane_in_name
  ORDER BY transactions DESC
  LIMIT 1
  ```

---

## Domain: Device

### T-DEV-01
- **Status:** `✅`
- **Question:** Hệ thống có bao nhiêu camera?
- **Expected Result:** Một số nguyên, ví dụ `42`
- **Expected SQL:**
  ```sql
  SELECT COUNT(*) AS camera_count
  FROM sdp_golden.dim_device
  WHERE device_type LIKE '%Camera%'
  ```
- **Trap:** AI không được dùng `device_type = 'Camera'` (chỉ 4 giá trị cũ) — phải dùng LIKE

---

### T-DEV-02
- **Status:** `✅`
- **Question:** Đếm tất cả thiết bị theo từng loại
- **Expected Result:** Nhiều hàng: `device_type | total`, sắp xếp giảm dần
- **Expected SQL:**
  ```sql
  SELECT device_type, COUNT(*) AS total
  FROM sdp_golden.dim_device
  GROUP BY device_type
  ORDER BY total DESC
  ```

---

### T-DEV-03
- **Status:** `✅`
- **Question:** Thiết bị nào đang OFFLINE hiện tại?
- **Expected Result:** Danh sách device: `device_code | device_type | event_time`
- **Expected SQL:**
  ```sql
  SELECT DISTINCT s.device_id, s.device_code, s.device_type, s.event_time
  FROM sdp_golden.stg_dmp_device_status_events s
  INNER JOIN (
    SELECT device_id, MAX(event_time) AS latest
    FROM sdp_golden.stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id
  ) latest ON s.device_id = latest.device_id AND s.event_time = latest.latest
  WHERE s.current_status = 'OFFLINE'
  ORDER BY s.event_time DESC
  ```
- **Trap:** Phải lấy trạng thái MỚI NHẤT, không phải tất cả record OFFLINE

---

### T-DEV-04
- **Status:** `✅`
- **Question:** Thiết bị nào đang gắn tại tòa nhà BUILDING_001?
- **Expected Result:** Danh sách: `device_name | device_type | asset_name`
- **Expected SQL:**
  ```sql
  SELECT device_name, device_type, asset_name, asset_type
  FROM sdp_golden.dim_device_asset
  WHERE asset_name = 'BUILDING_001'
  ORDER BY device_type, device_name
  ```

---

### T-DEV-05
- **Status:** `✅`
- **Question:** Số thiết bị theo từng loại vị trí (building, floor, zone)?
- **Expected Result:** 3–5 hàng: `asset_type | device_count`
- **Expected SQL:**
  ```sql
  SELECT asset_type, COUNT(DISTINCT device_id) AS device_count
  FROM sdp_golden.dim_device_asset
  GROUP BY asset_type
  ORDER BY device_count DESC
  ```

---

## Domain: Asset

### T-ASS-01
- **Status:** `❌`
- **Question:** Hệ thống có bao nhiêu tòa nhà?
- **Expected Result:** Một số nguyên
- **Expected SQL:**
  ```sql
  SELECT COUNT(*) AS building_count
  FROM sdp_golden.dim_asset
  WHERE asset_type = 'building'
  ```
- **Trap:** AI phải dùng lowercase `'building'`, không phải `'Building'`

---

### T-ASS-02
- **Status:** `✅`
- **Question:** Liệt kê các loại asset và số lượng
- **Expected Result:** 5 hàng: `asset_type | total`
- **Expected SQL:**
  ```sql
  SELECT asset_type, COUNT(*) AS total
  FROM sdp_golden.dim_asset
  GROUP BY asset_type
  ORDER BY total DESC
  ```

---

### T-ASS-03
- **Status:** `✅`
- **Question:** Tầng nào có nhiều thiết bị nhất?
- **Expected Result:** Hàng đầu: `asset_name | device_count`
- **Expected SQL:**
  ```sql
  SELECT asset_name, COUNT(DISTINCT device_id) AS device_count
  FROM sdp_golden.dim_device_asset
  WHERE asset_type = 'floor'
  GROUP BY asset_name
  ORDER BY device_count DESC
  LIMIT 1
  ```

---

## Domain: Telemetry

### T-TLM-01
- **Status:** `✅`
- **Question:** Tiêu thụ điện tháng này của từng đồng hồ điện?
- **Expected Result:** Nhiều hàng: `device_name | consumption_kwh`
- **Expected SQL:**
  ```sql
  SELECT d.device_name,
         ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
  FROM sdp_golden.stg_mv_dmp_tlm_energy_meter e
  JOIN sdp_golden.dim_device d ON e.deviceId = d.device_id
  WHERE DATE_FORMAT(e.tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
  GROUP BY d.device_name
  ORDER BY consumption_kwh DESC
  ```
- **Trap:** Phải dùng `MAX - MIN` (counter tích lũy); join key là `deviceId` (camelCase)

---

### T-TLM-02
- **Status:** `✅`
- **Question:** Chiller nào đang báo lỗi?
- **Expected Result:** Danh sách chiller: `device_name | fault | eventTime`
- **Expected SQL:**
  ```sql
  SELECT d.device_name, c.fault, c.chiller_state, c.eventTime
  FROM sdp_golden.stg_mv_dmp_tlm_chiller c
  JOIN sdp_golden.dim_device d ON c.deviceId = d.device_id
  WHERE c.fault = true
    AND c.tsDt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
  ORDER BY c.eventTime DESC
  ```

---

### T-TLM-03
- **Status:** `✅`
- **Question:** Camera nào có CPU cao nhất hiện tại?
- **Expected Result:** Top 5: `device_name | cpu_usage_pct`
- **Expected SQL:**
  ```sql
  SELECT d.device_name, c.cpu_usage_pct, c.memory_used_mb
  FROM sdp_golden.stg_mv_dmp_tlm_camera c
  JOIN sdp_golden.dim_device d ON c.deviceId = d.device_id
  INNER JOIN (
    SELECT deviceId, MAX(tsDt) AS latest
    FROM sdp_golden.stg_mv_dmp_tlm_camera
    GROUP BY deviceId
  ) latest ON c.deviceId = latest.deviceId AND c.tsDt = latest.latest
  ORDER BY c.cpu_usage_pct DESC
  LIMIT 5
  ```

---

### T-TLM-04
- **Status:** `✅`
- **Question:** Tiêu thụ điện tháng này tại tòa nhà BUILDING_001?
- **Expected Result:** Một số: `consumption_kwh`
- **Expected SQL:**
  ```sql
  SELECT da.asset_name,
         ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
  FROM sdp_golden.stg_mv_dmp_tlm_energy_meter e
  JOIN sdp_golden.dim_device d        ON e.deviceId = d.device_id
  JOIN sdp_golden.dim_device_asset da ON d.device_id = da.device_id
  WHERE da.asset_name = 'BUILDING_001'
    AND DATE_FORMAT(e.tsDt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
  GROUP BY da.asset_name
  ```
- **Trap:** Cross-domain join 3 bảng; không có direct link từ telemetry → asset

---

## Cross-Domain

### T-CRS-01
- **Status:** `✅`
- **Question:** Doanh thu theo từng khu vực (area) tháng này?
- **Expected Result:** 20 hàng: `area_id | revenue_vnd`
- **Expected SQL:**
  ```sql
  SELECT l.area_id,
         SUM(e.amount_due) AS revenue_vnd,
         COUNT(*) AS transactions
  FROM sdp_golden.fct_vehicle_events e
  JOIN sdp_golden.dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
  JOIN sdp_golden.dim_date d        ON e.check_in_date_key = d.date_key
  WHERE e.history_state = 'COMPLETED'
    AND d.month = MONTH(NOW()) AND d.year = YEAR(NOW())
  GROUP BY l.area_id
  ORDER BY revenue_vnd DESC
  ```

---

### T-CRS-02
- **Status:** `✅`
- **Question:** Tỉ lệ online của camera theo từng tòa nhà?
- **Expected Result:** Nhiều hàng: `asset_name | online_pct`
- **Expected SQL:**
  ```sql
  SELECT da.asset_name,
         ROUND(100.0 * SUM(CAST(s.is_online AS INT)) / COUNT(*), 2) AS online_pct
  FROM sdp_golden.stg_dmp_device_status_events s
  JOIN sdp_golden.dim_device d        ON s.device_id = d.device_id
  JOIN sdp_golden.dim_device_asset da ON d.device_id = da.device_id
  WHERE s.event_type = 'STATUS_CHANGE'
    AND d.device_type LIKE '%Camera%'
    AND da.asset_type = 'building'
  GROUP BY da.asset_name
  ORDER BY online_pct ASC
  ```

---

---

## Domain: Parking — Ambiguous Time (từ AC.xlsx)

> Kiểm tra default time resolution: "tháng này" vs "30 ngày qua", "tuần này" vs "7 ngày qua"

### T-PRK-13
- **Status:** `✅`
- **Question:** Doanh thu tháng này?
- **Default áp dụng:** "tháng này" = calendar month (từ ngày 1 đến nay), không phải 30-day rolling
- **Expected Result:** Một số VND
- **Expected SQL:**
  ```sql
  SELECT SUM(amount_due) AS revenue_vnd
  FROM sdp_golden.fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND YEAR(check_out_date_key_ts) = YEAR(NOW())
    AND MONTH(check_out_date_key_ts) = MONTH(NOW())
  ```
  hoặc với date_key:
  ```sql
  WHERE history_state = 'COMPLETED'
    AND check_out_date_key BETWEEN CAST(DATE_FORMAT(DATE_FORMAT(NOW(),'%Y-%m-01'),'%Y%m%d') AS INT)
    AND CAST(DATE_FORMAT(NOW(),'%Y%m%d') AS INT)
  ```
- **Trap:** AI không được dùng `>= DATE_SUB(NOW(), INTERVAL 30 DAY)` — đó là 30-day rolling, không phải "tháng này"

---

### T-PRK-14
- **Status:** `⚠`
- **Question:** Doanh thu tháng trước?
- **Default áp dụng:** "tháng trước" = tháng lịch trước (toàn bộ tháng), không phải 30-60 ngày qua
- **Expected Result:** Một số VND
- **Expected SQL:**
  ```sql
  SELECT SUM(amount_due) AS revenue_vnd
  FROM sdp_golden.fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_out_date_key >= CAST(DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y%m01') AS INT)
  ```
- **Trap:** Phải dùng `check_out_date_key` (không phải `check_in_date_key`); phải là toàn bộ tháng trước

---

### T-PRK-15
- **Status:** `✅`
- **Question:** So sánh doanh thu tháng này với tháng trước?
- **Default áp dụng:** Trend → time series; grain tháng (2 điểm)
- **Expected Result:** 2 hàng: `month | revenue_vnd`
- **Expected SQL:**
  ```sql
  SELECT d.year_month,
         SUM(e.amount_due) AS revenue_vnd,
         COUNT(*) AS transactions
  FROM sdp_golden.fct_vehicle_events e
  JOIN sdp_golden.dim_date d ON e.check_out_date_key = d.date_key
  WHERE e.history_state = 'COMPLETED'
    AND d.year_month IN (
      DATE_FORMAT(NOW(), '%Y-%m'),
      DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m')
    )
  GROUP BY d.year_month
  ORDER BY d.year_month
  ```

---

### T-PRK-16
- **Status:** `✅`
- **Question:** Số lượt xe vào tuần này?
- **Default áp dụng:** "Tuần này" = Monday–now (calendar week), không phải rolling 7 ngày; đây là câu hỏi về lưu lượng vào nên dùng `check_in_date_key`
- **Expected Result:** Một số nguyên
- **Expected SQL:**
  ```sql
  SELECT COUNT(*) AS vehicle_entries
  FROM sdp_golden.fct_vehicle_events e
  JOIN sdp_golden.dim_date d ON e.check_in_date_key = d.date_key
  WHERE YEARWEEK(d.full_date) = YEARWEEK(CURRENT_DATE)
  ```
- **Trap:** "Lượt vào" → `check_in_date_key` (không phải `check_out_date_key`); "tuần này" ≠ "7 ngày qua"; YEARWEEK chỉ nhận 1 arg và DATE type (không phải Timestamp)

---

### T-PRK-17
- **Status:** `⚠`
- **Question:** Top bãi xe có doanh thu cao nhất tháng này?
- **Default áp dụng:** "Top" không nêu N → default 5; "tháng này" = calendar month
- **Expected Result:** 5 hàng: `pk_lot_name | area_id | revenue_vnd`
- **Expected SQL:**
  ```sql
  SELECT l.pk_lot_name, l.area_id, SUM(e.amount_due) AS revenue_vnd
  FROM sdp_golden.fct_vehicle_events e
  JOIN sdp_golden.dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
  WHERE e.history_state = 'COMPLETED'
    AND e.check_out_date_key BETWEEN CAST(DATE_FORMAT(NOW(), '%Y%m01') AS INT) AND CAST(DATE_FORMAT(NOW(), '%Y%m%d') AS INT)
  GROUP BY l.pk_lot_name, l.area_id
  ORDER BY revenue_vnd DESC
  LIMIT 5
  ```
- **Trap:** Top không nêu N → LIMIT 5; "tháng này" dùng BETWEEN hoặc dim_date join đều chấp nhận

---

## Domain: Device — Status & Fault (từ AC.xlsx)

> Nguồn: AC.xlsx Task 1 AC 234 (câu 19, 22, 23) và Task 3 AC 4 (câu 16, 17, 19)

### T-DEV-06
- **Status:** `⚠`
- **Question:** Danh sách camera đang bị hỏng hoặc offline?
- **Default áp dụng:** "Hỏng" = không gửi tín hiệu > 3 ngày; query tại CURRENT_TIMESTAMP
- **Expected Result:** Danh sách: `device_name | device_type | last_signal_ts | status`
- **Expected SQL:**
  ```sql
  SELECT d.device_name, d.device_type,
         s.event_time AS last_signal_ts,
         s.current_status
  FROM sdp_golden.dim_device d
  LEFT JOIN (
    SELECT device_id, MAX(event_time) AS event_time, current_status
    FROM sdp_golden.stg_dmp_device_status_events
    WHERE event_type = 'STATUS_CHANGE'
    GROUP BY device_id, current_status
  ) s ON d.device_id = s.device_id
  WHERE d.device_type LIKE '%Camera%'
    AND (s.current_status = 'OFFLINE'
         OR s.event_time < DATE_SUB(NOW(), INTERVAL 3 DAY))
  ```
- **Trap:** "Hỏng" bao gồm cả mất tín hiệu > 3 ngày, không chỉ `status = OFFLINE`

---

### T-DEV-07
- **Status:** `❌`
- **Question:** Tỷ lệ thiết bị đang hoạt động (uptime) toàn hệ thống?
- **Default áp dụng:** METRIC → 30 ngày rolling; kết quả 1 số %; phân loại ngưỡng: ≥95% Tốt, 80–95% Theo dõi, <80% Thấp
- **Expected Result:** Một số %, ví dụ `92.5%` + label "Cần theo dõi"
- **Expected SQL:**
  ```sql
  SELECT
    ROUND(100.0 * SUM(CASE WHEN current_status = 'ONLINE' THEN 1 ELSE 0 END) / COUNT(*), 2) AS online_pct,
    CASE
      WHEN ROUND(100.0 * SUM(CASE WHEN current_status = 'ONLINE' THEN 1 ELSE 0 END) / COUNT(*), 2) >= 95 THEN 'Tốt'
      WHEN ROUND(100.0 * SUM(CASE WHEN current_status = 'ONLINE' THEN 1 ELSE 0 END) / COUNT(*), 2) >= 80 THEN 'Cần theo dõi'
      ELSE 'Thấp'
    END AS verdict
  FROM (
    SELECT s.device_id, s.current_status
    FROM sdp_golden.stg_dmp_device_status_events s
    INNER JOIN (
      SELECT device_id, MAX(event_time) AS latest
      FROM sdp_golden.stg_dmp_device_status_events
      WHERE event_type = 'STATUS_CHANGE'
      GROUP BY device_id
    ) latest ON s.device_id = latest.device_id AND s.event_time = latest.latest
  ) current_state
  ```
- **Trap:** Phải lấy trạng thái MỚI NHẤT mỗi thiết bị; thêm verdict theo ngưỡng uptime

---

### T-DEV-08
- **Status:** `⚠`
- **Question:** Thiết bị nào có số lần mất kết nối nhiều nhất trong 14 ngày qua?
- **Default áp dụng:** "14 ngày qua" = rõ → historical; Top không nêu N → 5; grain 7–90 ngày → grain tuần
- **Expected Result:** Top 5: `device_name | device_type | disconnect_count`
- **Expected SQL:**
  ```sql
  SELECT d.device_name, d.device_type, COUNT(*) AS disconnect_count
  FROM sdp_golden.stg_dmp_device_status_events s
  JOIN sdp_golden.dim_device d ON s.device_id = d.device_id
  WHERE s.event_type = 'STATUS_CHANGE'
    AND s.current_status = 'OFFLINE'
    AND s.event_time >= DATE_SUB(NOW(), INTERVAL 14 DAY)
  GROUP BY d.device_name, d.device_type
  ORDER BY disconnect_count DESC
  LIMIT 5
  ```
- **Trap:** "14 ngày" = user nói rõ → không áp default; Top không nêu → LIMIT 5

---

### T-DEV-09
- **Status:** `❌`
- **Question:** Danh sách các thang máy đang bảo trì hoặc hỏng?
- **Default áp dụng:** Query tại CURRENT_TIMESTAMP; "hỏng" = không gửi tín hiệu > 3 ngày
- **Expected Result:** Danh sách: `device_name | device_type | last_seen`
- **Expected SQL:**
  ```sql
  SELECT d.device_name, d.device_type, MAX(s.event_time) AS last_seen
  FROM sdp_golden.dim_device d
  LEFT JOIN sdp_golden.stg_dmp_device_status_events s ON d.device_id = s.device_id
  WHERE d.device_type LIKE '%elevator%' OR d.device_type LIKE '%Elevator%'
    OR d.device_type LIKE '%thang%' OR d.device_type LIKE '%lift%'
  GROUP BY d.device_name, d.device_type
  HAVING MAX(s.event_time) < DATE_SUB(NOW(), INTERVAL 3 DAY)
     OR MAX(s.event_time) IS NULL
  ```
- **Trap:** "Hỏng" = last_signal < NOW() - 3 days; device_type dùng LIKE vì free-text

---

## Domain: Device — Thresholds & Anomaly (từ AC.xlsx)

> Nguồn: AC.xlsx Task 1 AC 234 (câu 8, 13, 14, 32) và Task 3 AC 4 (câu 21–25)

### T-THR-01
- **Status:** `❌`
- **Question:** Liệt kê các CO2 sensor được lắp tại tầng 3 tòa nhà A?
- **Default áp dụng:** Không có bảng CO2 ppm telemetry — dùng dim_device + dim_device_asset để liệt kê sensor và vị trí
- **Expected Result:** Danh sách CO2 sensor tại floor 3 và vị trí gắn
- **Expected SQL:**
  ```sql
  SELECT d.device_name, d.device_type, da.asset_name
  FROM sdp_golden.dim_device d
  JOIN sdp_golden.dim_device_asset da ON d.device_id = da.device_id
  WHERE (d.device_type LIKE '%co2%' OR d.device_type LIKE '%CO2%')
    AND da.asset_name LIKE '%FLOOR%3%'
  ORDER BY da.asset_name, d.device_name
  ```
- **Trap:** stg_mv_dmp_tlm_co2_sensor không tồn tại — chỉ có thể query device info từ dim_device + dim_device_asset; region/zone lấy từ asset

---

### T-THR-02
- **Status:** `✅`
- **Question:** Camera nào có RAM usage cao?
- **Default áp dụng:** "Cao" = > 70% theo threshold_defaults; query tại CURRENT_TIMESTAMP
- **Expected Result:** Danh sách: `device_name | ram_usage_pct` sắp xếp giảm dần
- **Expected SQL:**
  ```sql
  SELECT d.device_name, c.memory_used_mb,
         c.cpu_usage_pct
  FROM sdp_near_realtime.stg_mv_dmp_tlm_camera c
  JOIN sdp_golden.dim_device d ON c.deviceId = d.device_id
  INNER JOIN (
    SELECT deviceId, MAX(tsDt) AS latest
    FROM sdp_near_realtime.stg_mv_dmp_tlm_camera
    GROUP BY deviceId
  ) x ON c.deviceId = x.deviceId AND c.tsDt = x.latest
  WHERE c.cpu_usage_pct > 70
  ORDER BY c.cpu_usage_pct DESC
  ```
- **Trap:** "Cao" = > 70%; phải lấy latest record mỗi camera; đơn vị có thể là % hoặc MB

---

### T-THR-03
- **Status:** `❌`
- **Question:** Camera nào có chất lượng hình ảnh kém (low light hoặc noise)?
- **Default áp dụng:** Không có cột quality score — dùng cpu_usage_pct và memory_used_mb làm proxy; camera_quality_score/snr_db/brightness_avg không tồn tại trong schema
- **Expected Result:** Danh sách camera với cpu/memory cao (proxy cho health kém)
- **Expected SQL:**
  ```sql
  SELECT d.device_name, c.cpu_usage_pct, c.memory_used_mb, c.memory_free_mb
  FROM sdp_near_realtime.stg_mv_dmp_tlm_camera c
  JOIN sdp_golden.dim_device d ON c.deviceId = d.device_id
  INNER JOIN (
    SELECT deviceId, MAX(tsDt) AS latest
    FROM sdp_near_realtime.stg_mv_dmp_tlm_camera
    GROUP BY deviceId
  ) x ON c.deviceId = x.deviceId AND c.tsDt = x.latest
  WHERE c.cpu_usage_pct > 70
  ORDER BY c.cpu_usage_pct DESC
  ```
- **Trap:** camera_quality_score, snr_db, brightness_avg không tồn tại trong stg_mv_dmp_tlm_camera; dùng cpu/memory làm proxy; lấy latest record

---

### T-THR-04
- **Status:** `✅`
- **Question:** Chiller nào đang tiêu thụ điện cao bất thường?
- **Default áp dụng:** "Bất thường" = > mean ± 30% so với 30 ngày trước; query tại CURRENT_TIMESTAMP
- **Expected Result:** Danh sách chiller với: `device_name | current_kwh | avg_30d | deviation_pct`
- **Expected SQL:**
  ```sql
  WITH baseline AS (
    SELECT e.deviceId,
           AVG(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total)) AS avg_daily_kwh
    FROM sdp_near_realtime.stg_mv_dmp_tlm_energy_meter e
    WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY e.deviceId, DATE(e.tsDt)
  ),
  latest_e AS (
    SELECT e.deviceId,
           MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total) AS today_kwh
    FROM sdp_near_realtime.stg_mv_dmp_tlm_energy_meter e
    WHERE DATE(e.tsDt) = CURRENT_DATE
    GROUP BY e.deviceId
  )
  SELECT d.device_name, le.today_kwh, b.avg_daily_kwh,
         ROUND(ABS(le.today_kwh - b.avg_daily_kwh) / b.avg_daily_kwh * 100, 1) AS deviation_pct
  FROM latest_e le
  JOIN baseline b ON le.deviceId = b.deviceId
  JOIN sdp_golden.dim_device d ON le.deviceId = d.device_id
  WHERE d.device_type LIKE '%chiller%'
    AND ABS(le.today_kwh - b.avg_daily_kwh) / b.avg_daily_kwh > 0.30
  ORDER BY deviation_pct DESC
  ```
- **Trap:** `stg_mv_dmp_tlm_chiller` KHÔNG có power/energy columns. Dùng `stg_mv_dmp_tlm_energy_meter` với MAX-MIN pattern; ngưỡng bất thường = mean ± 30%

---

## Domain: Telemetry — Chiller & Trend (từ AC.xlsx)

> Nguồn: AC.xlsx Task 1 AC 234 (câu 6, 17) và Task 3 AC 4 (câu 4, 10)

### T-TLM-05
- **Status:** `✅`
- **Question:** Tiêu thụ điện của CHILLER trong 7 ngày qua?
- **Default áp dụng:** "7 ngày qua" = user nói rõ → historical; grain ≤ 7 ngày → grain ngày; không grain → trả tổng
- **Expected Result:** Danh sách chiller: `device_name | consumption_kwh`
- **Expected SQL (tổng):**
  ```sql
  SELECT dev.device_name,
         ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
  FROM sdp_near_realtime.stg_mv_dmp_tlm_energy_meter e
  JOIN sdp_golden.dim_device dev ON e.deviceId = dev.device_id
  WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    AND (dev.device_type LIKE '%chiller%' OR dev.device_type LIKE '%Chiller%')
  GROUP BY e.deviceId, dev.device_name
  ORDER BY consumption_kwh DESC
  ```
- **Trap:** stg_mv_dmp_tlm_chiller KHÔNG có energy columns. Dùng stg_mv_dmp_tlm_energy_meter với filter device_type LIKE '%chiller%'. Energy counter là cumulative → MAX-MIN; "7 ngày qua" override default 30-day

---

### T-TLM-06
- **Status:** `⚠`
- **Question:** Nhiệt độ làm lạnh trung bình của tất cả chiller trong tuần trước?
- **Default áp dụng:** "Tuần trước" = user nói rõ → historical; "trung bình" → AVG (không phải MAX-MIN)
- **Expected Result:** Chiller state data (nhiệt độ không có trong schema)
- **Expected SQL:**
  ```sql
  SELECT c.deviceId,
         ROUND(AVG(c.chiller_state), 2) AS avg_chiller_state
  FROM sdp_near_realtime.stg_mv_dmp_tlm_chiller c
  WHERE c.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  GROUP BY c.deviceId
  ```
- **Trap:** `chilled_water_supply_temp_c` KHÔNG tồn tại trong stg_mv_dmp_tlm_chiller. Chiller table chỉ có chiller_state, fault, valve columns. Dùng chiller_state làm proxy. "Tuần trước" ≈ 7 ngày qua

---

### T-TLM-07
- **Status:** `✅`
- **Question:** Xu hướng tiêu thụ điện của đồng hồ điện trong 3 tháng gần nhất?
- **Default áp dụng:** "Xu hướng" → time series; 3 tháng > 90 ngày → grain tháng; energy counter → MAX-MIN
- **Expected Result:** 3 hàng: `year_month | consumption_kwh` (mỗi tháng 1 hàng)
- **Expected SQL:**
  ```sql
  SELECT DATE_FORMAT(e.tsDt, '%Y-%m') AS year_month,
         ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
  FROM sdp_near_realtime.stg_mv_dmp_tlm_energy_meter e
  WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
  GROUP BY DATE_FORMAT(e.tsDt, '%Y-%m')
  ORDER BY year_month
  ```
- **Trap:** "Xu hướng" → GROUP BY tháng (không trả 1 số); energy cumulative → MAX-MIN per month; grain >90d → grain tháng

---

## Domain: Ambiguity Defaults (từ AC.xlsx Task 3 AC 4)

> Kiểm tra khả năng áp dụng default rules khi câu hỏi mơ hồ

### T-AMB-01
- **Status:** `⚠`
- **Question:** Tiêu thụ điện khu vực A là bao nhiêu?
- **Default áp dụng:** (1) Không rõ thời gian → 30-day rolling; (3) METRIC → 1 số tổng; (7) Không grain → trả tổng
- **Expected Result:** 1 số kWh
- **Expected SQL:**
  ```sql
  SELECT ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
  FROM sdp_near_realtime.stg_mv_dmp_tlm_energy_meter e
  JOIN sdp_golden.dim_device d ON e.deviceId = d.device_id
  JOIN sdp_golden.dim_device_asset da ON d.device_id = da.device_id
  WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND da.asset_name LIKE '%A%'
  ```
- **Trap:** Không rõ thời gian → default 30 ngày; không rõ grain → trả 1 số (không GROUP BY time)

---

### T-AMB-02
- **Status:** `✅`
- **Question:** Top khu vực tiêu thụ điện nhiều nhất?
- **Default áp dụng:** (8) Top N = 5; (3) METRIC → 30 ngày rolling; "nhiều nhất" = DESC
- **Expected Result:** Top 5 hàng: `area/building | consumption_kwh`
- **Expected SQL:**
  ```sql
  SELECT da.asset_name,
         ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
  FROM sdp_near_realtime.stg_mv_dmp_tlm_energy_meter e
  JOIN sdp_golden.dim_device d ON e.deviceId = d.device_id
  JOIN sdp_golden.dim_device_asset da ON d.device_id = da.device_id
  WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  GROUP BY da.asset_name
  ORDER BY consumption_kwh DESC
  LIMIT 5
  ```
- **Trap:** Top không nêu N → LIMIT 5; không nêu thời gian → 30-day default

---

### T-AMB-03
- **Status:** `⚠`
- **Question:** Xu hướng tiêu thụ điện khu vực B trong tuần qua?
- **Default áp dụng:** (1) "Tuần qua" = user nói rõ → 7 ngày; (4) Trend → time series; grain ≤ 7 ngày → grain ngày
- **Expected Result:** 7 hàng: `date | consumption_kwh`
- **Expected SQL:**
  ```sql
  SELECT DATE_FORMAT(e.tsDt, '%Y-%m-%d') AS day,
         ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
  FROM sdp_near_realtime.stg_mv_dmp_tlm_energy_meter e
  JOIN sdp_golden.dim_device d ON e.deviceId = d.device_id
  JOIN sdp_golden.dim_device_asset da ON d.device_id = da.device_id
  WHERE e.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    AND da.asset_name LIKE '%B%'
  GROUP BY DATE_FORMAT(e.tsDt, '%Y-%m-%d')
  ORDER BY day
  ```
- **Trap:** "Xu hướng" + "tuần qua" = time series grain ngày (7 hàng); không trả 1 số. KHÔNG dùng DATE() — dùng DATE_FORMAT(tsDt, '%Y-%m-%d')

---

### T-AMB-04
- **Status:** `❌`
- **Question:** Khu vực nào có nhiều CO2 sensor nhất trong hệ thống?
- **Default áp dụng:** Không có bảng CO2 ppm telemetry — dùng dim_device + dim_device_asset để liệt kê khu vực có CO2 sensor
- **Expected Result:** Danh sách khu vực và số lượng CO2 sensor
- **Expected SQL:**
  ```sql
  SELECT da.asset_name, COUNT(DISTINCT d.device_id) AS co2_sensor_count
  FROM sdp_golden.dim_device d
  JOIN sdp_golden.dim_device_asset da ON d.device_id = da.device_id
  WHERE d.device_type LIKE '%co2%' OR d.device_type LIKE '%CO2%'
  GROUP BY da.asset_name
  ORDER BY co2_sensor_count DESC
  LIMIT 5
  ```
- **Trap:** stg_mv_dmp_tlm_co2_sensor không tồn tại; CO2 region lấy từ dim_device_asset (asset_name); không thể trả ppm vì không có telemetry data

---

### T-AMB-05
- **Status:** `✅`
- **Question:** Tỷ lệ thiết bị đang hoạt động (uptime) toàn hệ thống?
- **Default áp dụng:** (3) METRIC → 30 ngày rolling; (7) Không grain → 1 số %; (10) Phân loại: ≥95% Tốt
- **Expected Result:** 1 số % + verdict
- **Expected SQL:**
  ```sql
  SELECT
    ROUND(100.0 * SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) AS online_pct,
    CASE
      WHEN ROUND(100.0 * SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) >= 95 THEN 'Tốt'
      WHEN ROUND(100.0 * SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) >= 80 THEN 'Cần theo dõi'
      ELSE 'Thấp'
    END AS verdict
  FROM (
    SELECT s.device_id, s.is_online
    FROM sdp_golden.stg_dmp_device_status_events s
    INNER JOIN (
      SELECT device_id, MAX(event_time) AS latest
      FROM sdp_golden.stg_dmp_device_status_events
      WHERE event_type = 'STATUS_CHANGE'
      GROUP BY device_id
    ) x ON s.device_id = x.device_id AND s.event_time = x.latest
  ) t
  ```
- **Trap:** "Uptime" → tỉ lệ online theo trạng thái MỚI NHẤT; thêm verdict theo ngưỡng; không tính theo lịch sử sự kiện

---

### T-AMB-06
- **Status:** `✅`
- **Question:** Số liệu và xu hướng tiêu thụ điện tháng trước khu vực C?
- **Default áp dụng:** Câu hỏi gộp METRIC + TREND → ưu tiên TREND (time series); "tháng trước" = rõ; grain ngày
- **Expected Result:** ~28–30 hàng: `day | consumption_kwh`
- **Expected SQL:**
  ```sql
  SELECT DATE_FORMAT(e.tsDt, '%Y-%m-%d') AS day,
         ROUND(MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total), 3) AS consumption_kwh
  FROM sdp_near_realtime.stg_mv_dmp_tlm_energy_meter e
  JOIN sdp_golden.dim_device d ON e.deviceId = d.device_id
  JOIN sdp_golden.dim_device_asset da ON d.device_id = da.device_id
  WHERE DATE_FORMAT(e.tsDt, '%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m')
    AND da.asset_name LIKE '%C%'
  GROUP BY DATE_FORMAT(e.tsDt, '%Y-%m-%d')
  ORDER BY day
  ```
- **Trap:** Gộp metric+trend → trả time series (không trả 1 số); "tháng trước" = calendar month; KHÔNG dùng YEARWEEK(tsDt, 1) — dùng DATE_FORMAT; KHÔNG dùng DATE() function

---

## Domain: Dashboard KPIs — Thẻ chỉ số tổng quan

> Nguồn: 4 KPI cards luôn hiển thị trên đầu dashboard (K1, K2, K3, K5)

### T-DSH-01
- **Status:** `[ ]`
- **Question:** Tỷ lệ xe điện (EV) trong tổng số giao dịch 30 ngày qua là bao nhiêu %?
- **Dashboard widget:** K1 — EV Penetration Rate
- **Expected Result:** 1 số %, ví dụ `19.3%`
- **Expected SQL:**
  ```sql
  SELECT
    ROUND(100.0 * SUM(CASE WHEN vehicle_type IN ('eCar','eBicycle','eMotorbike') THEN 1 ELSE 0 END)
          / NULLIF(COUNT(*), 0), 1) AS ev_penetration_pct
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_in_at >= NOW() - INTERVAL '30' DAY
  ```
- **Trap:** EV types = eCar, eBicycle, eMotorbike (lowercase, starts with 'e'); KHÔNG bao gồm car, bicycle, motorbike, truck; chia cho tổng giao dịch (bao gồm ICE), không phải chỉ known types; KHÔNG dùng `json_extract` hay subquery phức tạp

---

### T-DSH-02
- **Status:** `[ ]`
- **Question:** Tổng tiêu thụ điện của toàn bộ smart meter trong 3 ngày qua?
- **Dashboard widget:** K3 — Total Energy Consumed (kWh, 3-day total across 36 meters)
- **Expected Result:** 1 số kWh, ví dụ `744,300`
- **Expected SQL:**
  ```sql
  WITH per_device AS (
    SELECT deviceId,
           MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS consumed_kwh
    FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
    WHERE tsDt >= NOW() - INTERVAL '3' DAY
    GROUP BY deviceId
  )
  SELECT ROUND(SUM(consumed_kwh), 2) AS total_energy_kwh,
         COUNT(DISTINCT deviceId) AS meter_count
  FROM per_device
  ```
- **Trap:** Energy là cumulative counter → phải dùng MAX-MIN per device rồi SUM; KHÔNG dùng SUM(energy_active_kwh_total) trực tiếp; window = 3 ngày (không phải tháng)

---

### T-DSH-03
- **Status:** `[ ]`
- **Question:** Hiện tại tổng số xe đang đỗ trên toàn hệ thống là bao nhiêu?
- **Dashboard widget:** K5 — Current Active Parked Vehicles (aggregate all lots)
- **Expected Result:** 1 số nguyên, ví dụ `1310`
- **Expected SQL:**
  ```sql
  SELECT SUM(current_occupancy) AS total_active_parked
  FROM sdp_mart_fct_parking_occupancy
  WHERE occupancy_hour = (
    SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy
  )
  ```
- **Trap:** Phải lấy occupancy_hour MỚI NHẤT (không phải tổng tất cả giờ); SUM toàn bộ lots (không GROUP BY); `fct_parking_occupancy` dùng `current_occupancy` field

---

## Domain: Environmental — Năng lượng & Nước (Tab Environmental)

> Nguồn: Tab Environmental của dashboard — E1, E2, E3

### T-ENV-01
- **Status:** `[ ]`
- **Question:** Nhu cầu công suất điện theo từng giờ trong ngày hôm nay — peak, trung bình và thấp nhất?
- **Dashboard widget:** E2 — Hourly Power Demand Profile (kW)
- **Expected Result:** 24 hàng: `hour | peak_kw | avg_kw | min_kw`
- **Expected SQL:**
  ```sql
  SELECT HOUR(tsDt) AS hour_of_day,
         MAX(power_active_kw) AS peak_kw,
         ROUND(AVG(power_active_kw), 2) AS avg_kw,
         MIN(power_active_kw) AS min_kw
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE tsDt >= DATE_FORMAT(NOW(), '%Y-%m-%d 00:00:00')
  GROUP BY HOUR(tsDt)
  ORDER BY hour_of_day
  ```
- **Trap:** Dùng `HOUR(tsDt)` (KHÔNG dùng `DATE_PART`, `DAYOFWEEK`, `EXTRACT(HOUR FROM ...)`); kết quả là 3 metrics: peak/avg/min (không phải 1 số); `power_active_kw` là instant reading (không phải cumulative → không cần MAX-MIN)

---

### T-ENV-02
- **Status:** `[ ]`
- **Question:** Xu hướng tiêu thụ điện và nước theo từng ngày trong 7 ngày qua?
- **Dashboard widget:** E1 — Daily Energy & Water Consumption (dual line)
- **Expected Result:** 7 hàng: `day | energy_kwh | water_m3`
- **Expected SQL:**
  ```sql
  WITH daily AS (
    SELECT DATE_FORMAT(tsDt, '%Y-%m-%d') AS day, deviceId,
           MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total) AS energy_kwh,
           MAX(water_volume_m3_total)   - MIN(water_volume_m3_total)   AS water_m3
    FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
    WHERE tsDt >= NOW() - INTERVAL '7' DAY
    GROUP BY DATE_FORMAT(tsDt, '%Y-%m-%d'), deviceId
  )
  SELECT day,
         ROUND(SUM(energy_kwh), 2) AS total_energy_kwh,
         ROUND(SUM(water_m3), 2)   AS total_water_m3
  FROM daily
  GROUP BY day
  ORDER BY day
  ```
- **Trap:** Cả điện lẫn nước đều là cumulative counter → MAX-MIN per device per day rồi SUM; KHÔNG dùng `DATE()` function; "7 ngày qua" = 7 ngày rolling

---

### T-ENV-03
- **Status:** `[ ]`
- **Question:** Power factor trung bình, thấp nhất và tổng tiêu thụ điện, nước của từng smart meter trong 3 ngày qua?
- **Dashboard widget:** E3 — Power Factor & Consumption by Device (table: Avg PF, Min PF, Total kWh, Total Water m³)
- **Expected Result:** Nhiều hàng: `device_id | avg_pf | min_pf | total_kwh | total_water_m3`
- **Expected SQL:**
  ```sql
  SELECT deviceId AS device_id,
         ROUND(AVG(power_factor), 3)   AS avg_pf,
         ROUND(MIN(power_factor), 3)   AS min_pf,
         ROUND(MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total), 2) AS total_kwh,
         ROUND(MAX(water_volume_m3_total)   - MIN(water_volume_m3_total), 2)   AS total_water_m3
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE tsDt >= NOW() - INTERVAL '3' DAY
  GROUP BY deviceId
  ORDER BY total_kwh DESC
  ```
- **Trap:** `power_factor` là instant reading → dùng AVG/MIN trực tiếp; `energy` và `water` là cumulative → MAX-MIN; join với dim_device nếu muốn device_name; KHÔNG dùng SUM cho energy/water

---

## Domain: Social Parking — Phân tích giao thông & Doanh thu (Tab Social)

> Nguồn: Tab Social và Tab Environmental của dashboard — E4, E5, S1–S5

### T-SOC-01
- **Status:** `[ ]`
- **Question:** Phân bố loại xe trong tổng số giao dịch tháng này (số lượng và tỷ lệ %)?
- **Dashboard widget:** E4 — Vehicle Type Distribution (EV vs ICE pie chart)
- **Expected Result:** 7 hàng: `vehicle_type | count | pct`
- **Expected SQL:**
  ```sql
  SELECT vehicle_type,
         COUNT(*) AS transaction_count,
         ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS pct
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_in_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
  GROUP BY vehicle_type
  ORDER BY transaction_count DESC
  ```
- **Trap:** Bao gồm TẤT CẢ loại xe (không filter chỉ EV); `OVER()` không có PARTITION BY (tính tổng toàn bộ); kết quả có thể gồm NULL values; window = tháng hiện tại

---

### T-SOC-02
- **Status:** `[ ]`
- **Question:** Thời gian đỗ xe trung bình theo từng loại xe?
- **Dashboard widget:** E5 — Avg Parking Duration by Vehicle Type (hour)
- **Expected Result:** 7 hàng: `vehicle_type | avg_park_hours`
- **Expected SQL:**
  ```sql
  SELECT vehicle_type,
         ROUND(AVG(park_duration_ms) / 3600000.0, 2) AS avg_park_hours
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_out_at IS NOT NULL
    AND park_duration_ms > 0
  GROUP BY vehicle_type
  ORDER BY avg_park_hours DESC
  ```
- **Trap:** Đơn vị là HOURS (chia 3,600,000 ms); filter `park_duration_ms > 0` để loại outliers; bao gồm TẤT CẢ loại xe (motorbike, car, eCar, eBicycle, eMotorbike, bicycle, truck)

---

### T-SOC-03
- **Status:** `[ ]`
- **Question:** Doanh thu theo từng loại xe trong tháng này?
- **Dashboard widget:** S2 — Total Revenue by Vehicle Type (VND bar chart)
- **Expected Result:** 7 hàng: `vehicle_type | revenue_vnd`
- **Expected SQL:**
  ```sql
  SELECT vehicle_type,
         SUM(amount_due) AS revenue_vnd
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_in_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
  GROUP BY vehicle_type
  ORDER BY revenue_vnd DESC
  ```
- **Trap:** Dùng `amount_due` (không phải `parking_fee`); bao gồm TẤT CẢ vehicle types; "tháng này" = calendar month từ ngày 1

---

### T-SOC-04
- **Status:** `[ ]`
- **Question:** Số lượt xe vào theo từng giờ trong ngày — phân theo loại xe?
- **Dashboard widget:** S4 — Hourly Parking Demand (grouped bar by hour × vehicle type)
- **Expected Result:** Nhiều hàng: `hour_of_day | vehicle_type | vehicles_in`
- **Expected SQL:**
  ```sql
  SELECT HOUR(occupancy_hour) AS hour_of_day,
         vehicle_type,
         SUM(vehicles_in) AS vehicles_in
  FROM sdp_mart_fct_parking_occupancy
  WHERE occupancy_date >= DATE_FORMAT(NOW() - INTERVAL '7' DAY, '%Y-%m-%d')
  GROUP BY HOUR(occupancy_hour), vehicle_type
  ORDER BY hour_of_day, vehicle_type
  ```
- **Trap:** Dùng `fct_parking_occupancy.vehicles_in` (không phải `fct_vehicle_events`); `HOUR(occupancy_hour)` để group theo giờ; `occupancy_hour` là datetime field

---

### T-SOC-05
- **Status:** `[ ]`
- **Question:** Tỷ lệ xe điện (EV) tại từng bãi đỗ trong tháng này?
- **Dashboard widget:** S3 — EV Penetration by Location (horizontal bar per lot)
- **Expected Result:** Nhiều hàng: `pk_lot_name | ev_count | total | ev_pct`
- **Expected SQL:**
  ```sql
  SELECT l.pk_lot_name,
         SUM(CASE WHEN e.vehicle_type IN ('eCar','eBicycle','eMotorbike') THEN 1 ELSE 0 END) AS ev_count,
         COUNT(*) AS total_count,
         ROUND(100.0 * SUM(CASE WHEN e.vehicle_type IN ('eCar','eBicycle','eMotorbike') THEN 1 ELSE 0 END)
               / NULLIF(COUNT(*), 0), 1) AS ev_pct
  FROM sdp_golden_fct_vehicle_events e
  JOIN sdp_golden_dim_parking_lot l ON e.parking_lot_id = l.pk_lot_id
  WHERE e.history_state = 'COMPLETED'
    AND e.check_in_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
  GROUP BY l.pk_lot_name
  ORDER BY ev_pct DESC
  ```
- **Trap:** EV types = eCar + eBicycle + eMotorbike (case-sensitive); `NULLIF(COUNT(*), 0)` để tránh chia 0; join với dim_parking_lot để lấy tên bãi

---

### T-SOC-06
- **Status:** `[ ]`
- **Question:** Tổng doanh thu theo từng phương thức thanh toán trong tháng này?
- **Dashboard widget:** S5 — Revenue by Payment Channel (donut chart VND)
- **Expected Result:** Nhiều hàng: `payment_type | revenue_vnd | pct`
- **Expected SQL:**
  ```sql
  SELECT payment_type,
         SUM(amount_due) AS revenue_vnd,
         ROUND(100.0 * SUM(amount_due) / SUM(SUM(amount_due)) OVER(), 2) AS pct
  FROM sdp_golden_fct_vehicle_events
  WHERE history_state = 'COMPLETED'
    AND check_in_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
  GROUP BY payment_type
  ORDER BY revenue_vnd DESC
  ```
- **Trap:** Khác T-PRK-05 (tỷ lệ GIAO DỊCH) — câu này hỏi DOANH THU (VND) theo payment channel; `SUM(SUM(...)) OVER()` để tính % trên tổng revenue

---

## Domain: Governance — Quản trị (Tab Governance)

> Nguồn: Tab Governance của dashboard — G1, G2

### T-GOV-01
- **Status:** `[ ]`
- **Question:** Số xe đang đỗ hiện tại tại từng bãi, phân theo khu vực (area)?
- **Dashboard widget:** G1 — Parking Lot Utilization by Org/Area (bar chart)
- **Expected Result:** Nhiều hàng: `area_id | pk_lot_name | current_parked`
- **Expected SQL:**
  ```sql
  SELECT l.area_id,
         l.pk_lot_name,
         SUM(o.current_occupancy) AS current_parked
  FROM sdp_mart_fct_parking_occupancy o
  JOIN sdp_golden_dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
  WHERE o.occupancy_hour = (
    SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy
  )
  GROUP BY l.area_id, l.pk_lot_name
  ORDER BY l.area_id, current_parked DESC
  ```
- **Trap:** Lấy giờ MỚI NHẤT (subquery MAX); GROUP BY cả area_id và pk_lot_name để hiển thị theo khu vực; không cần capacity (không có trong schema)

---

### T-GOV-02
- **Status:** `[ ]`
- **Question:** Danh sách các smart meter và tổng lượng điện tích lũy hiện tại của từng thiết bị?
- **Dashboard widget:** G2 — Smart Meter Deployment (table: device name, total accumulated kWh)
- **Expected Result:** Nhiều hàng: `device_name | latest_kwh_reading | latest_water_reading`
- **Expected SQL:**
  ```sql
  SELECT d.device_name,
         e.energy_active_kwh_total AS latest_energy_kwh,
         e.water_volume_m3_total   AS latest_water_m3,
         e.tsDt AS last_reading_time
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
  JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
  INNER JOIN (
    SELECT deviceId, MAX(tsDt) AS latest
    FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
    GROUP BY deviceId
  ) latest ON e.deviceId = latest.deviceId AND e.tsDt = latest.latest
  ORDER BY d.device_name
  ```
- **Trap:** Dùng MAX(tsDt) per device để lấy bản ghi MỚI NHẤT (đây là accumulated meter reading, không cần MAX-MIN); kết quả = giá trị tích lũy hiện tại của odometer

---

## Domain: Parking Occupancy — Tab Parking Lot Occupancy

> Nguồn: Tab Parking Lot Occupancy — P1, P3, P4

### T-OCC-01
- **Status:** `[ ]`
- **Question:** Xu hướng tổng số xe đỗ tích lũy theo từng ngày trong 30 ngày qua?
- **Dashboard widget:** P1 — Accumulated Occ Level KPIs (occupancy trend line)
- **Expected Result:** 30 hàng: `day | total_occupancy`
- **Expected SQL:**
  ```sql
  SELECT occupancy_date AS day,
         SUM(current_occupancy) AS total_occupancy
  FROM sdp_mart_fct_parking_occupancy
  WHERE occupancy_date >= DATE_FORMAT(NOW() - INTERVAL '30' DAY, '%Y-%m-%d')
  GROUP BY occupancy_date
  ORDER BY occupancy_date
  ```
- **Trap:** `occupancy_date` là DATE field (không cần HOUR extraction); SUM tất cả lots và vehicle types; "accumulated" = tổng tại mỗi ngày, không phải running total

---

### T-OCC-02
- **Status:** `[ ]`
- **Question:** Tổng số xe đang đỗ hiện tại theo từng tên bãi đỗ?
- **Dashboard widget:** P3 — Total Occ by Lot Name (bar chart per lot)
- **Expected Result:** 8 hàng: `pk_lot_name | current_parked` (số lots theo config)
- **Expected SQL:**
  ```sql
  SELECT l.pk_lot_name,
         SUM(o.current_occupancy) AS current_parked
  FROM sdp_mart_fct_parking_occupancy o
  JOIN sdp_golden_dim_parking_lot l ON o.parking_lot_id = l.pk_lot_id
  WHERE o.occupancy_hour = (
    SELECT MAX(occupancy_hour) FROM sdp_mart_fct_parking_occupancy
  )
  GROUP BY l.pk_lot_name
  ORDER BY current_parked DESC
  ```
- **Trap:** Khác T-PRK-07 — câu này GROUP BY pk_lot_name (text), không phải parking_lot_id; lấy giờ MỚI NHẤT

---

### T-OCC-03
- **Status:** `[ ]`
- **Question:** Số xe đỗ trung bình theo từng khung giờ trong ngày (trung bình theo lịch sử)?
- **Dashboard widget:** P4 — Avg Occ by Hour Name (bar chart by hour 0-23)
- **Expected Result:** 24 hàng: `hour_of_day | avg_occupancy`
- **Expected SQL:**
  ```sql
  SELECT HOUR(occupancy_hour) AS hour_of_day,
         ROUND(AVG(current_occupancy), 1) AS avg_occupancy
  FROM sdp_mart_fct_parking_occupancy
  GROUP BY HOUR(occupancy_hour)
  ORDER BY hour_of_day
  ```
- **Trap:** AVG qua tất cả ngày lịch sử (không filter ngày cụ thể); `HOUR(occupancy_hour)` để extract giờ từ datetime; không cần JOIN (chỉ cần fct_parking_occupancy)

---

## Summary

| Domain | Tổng | Pass | Fail | Chưa test |
|---|---|---|---|---|
| Parking — Revenue | 6 | 2 | 0 | 4 |
| Parking — Occupancy | 3 | 0 | 0 | 3 |
| Parking — Dwell/Lane | 3 | 0 | 0 | 3 |
| Parking — Ambiguous Time | 5 | 0 | 0 | 5 |
| Device | 5 | 0 | 0 | 5 |
| Device — Status & Fault | 4 | 0 | 0 | 4 |
| Device — Thresholds & Anomaly | 4 | 0 | 0 | 4 |
| Asset | 3 | 0 | 0 | 3 |
| Telemetry | 4 | 0 | 0 | 4 |
| Telemetry — Chiller & Trend | 3 | 0 | 0 | 3 |
| Cross-Domain | 2 | 0 | 0 | 2 |
| Ambiguity Defaults | 6 | 0 | 0 | 6 |
| Dashboard KPIs | 3 | 0 | 0 | 3 |
| Environmental (Energy+Water) | 3 | 0 | 0 | 3 |
| Social Parking | 6 | 0 | 0 | 6 |
| Governance | 2 | 0 | 0 | 2 |
| Parking Occupancy | 3 | 0 | 0 | 3 |
| **Tổng** | **65** | **0** | **0** | **65** |
