# Test Report — Wren AI Text-to-SQL (Test Run #1)

> **Ngày test:** 2026-06-19  
> **Người thực hiện:** Auto-script (`_test_question.py`) + phân tích thủ công  
> **URL hệ thống:** http://74.48.140.178:27668/home  
> **File kết quả:** `test/auto_results.json`  
> **File Excel:** `test/test_1.xlsx`

---

## 1. Kết quả tổng quan

| Chỉ số | Số lượng | Tỷ lệ |
|--------|---------|-------|
| **Tổng số câu hỏi** | 149 | 100% |
| **PASS** | 107 | **71.8%** |
| **FAIL** | 42 | **28.2%** |
| Thời gian trung bình (PASS) | ~16.5s | — |
| Thời gian trung bình (FAIL - GENERAL) | ~7.2s | — |
| Thời gian trung bình (FAIL - schema error) | ~35.8s | — |

---

## 2. Phân loại FAIL

### 2A — AI trả lời GENERAL (37 câu)

AI hiểu câu hỏi nhưng không map được sang SQL, trả về text giải thích thay vì query.

| Domain | Câu FAIL | Số lượng |
|--------|---------|---------|
| Parking — Giờ cao điểm / Area / Lane | Q006, Q007, Q011, Q017, Q025 | 5 |
| Parking — Trend count | Q023 | 1 |
| Asset / Building count | Q026, Q027, Q035 | 3 |
| Telemetry — 2-period compare / top device | Q045, Q049 | 2 |
| Camera — Offline detection | Q053, Q056, Q114 | 3 |
| Chiller — AND condition | Q063 | 1 |
| DMP Status — Offline reason / Distribution | Q074, Q080, Q082, Q085, Q092, Q100 | 6 |
| Raw table / Thang máy | Q104, Q105, Q107, Q136 | 4 |
| Telemetry — Khu vực C cụ thể | Q109, Q113, Q127 | 3 |
| Thiếu data (Water Tank / CO2 / Face Terminal) | Q122, Q128, Q134, Q138, Q139, Q140 | 6 |
| Multi-turn context | Q144, Q145, Q146 | 3 |
| **Tổng** | | **37** |

### 2B — NO_RELEVANT_SQL — Schema / SQL error (5 câu)

AI sinh SQL nhưng engine báo lỗi field/function không tồn tại.

| ID | Câu hỏi | Lỗi cụ thể | Nguyên nhân gốc |
|----|---------|-----------|----------------|
| **Q044** | Xu hướng tiêu thụ điện theo ngày trong tuần này? | `No matching function` | AI dùng `DATE_PART` / `DAYOFWEEK()` không hỗ trợ trong DataFusion |
| **Q054** | Camera nào có CPU usage vượt 80%? | `No field named t."deviceId"` | AI dùng alias `t` nhưng bảng camera dùng alias khác |
| **Q069** | Tỷ lệ thiết bị đang hoạt động (uptime)? | `No field named event_dbt_valid_to` | AI bịa field SCD trên bảng status_events — field này CHỈ có trên `dim_device_asset_snapshot` |
| **Q075** | Thiết bị không có telemetry trong 24 giờ qua? | `No field named device_id` | AI dùng `device_id` (snake_case) trong khi camera table dùng `deviceId` (camelCase) |
| **Q141** | CO2_SENSOR có giá trị > 1000 ppm? | `Invalid function 'json_extract'` | CO2 ppm lưu trong cột JSON blob — DataFusion không hỗ trợ `json_extract()` |

---

## 3. Phân tích root cause từng nhóm FAIL

### Nhóm 1: Parking real-time (Q006, Q007, Q011, Q017, Q025) — DATA CÓ, thiếu SQL pair

| ID | Field cần dùng | Vì sao FAIL |
|----|---------------|------------|
| Q006 | `fct_parking_occupancy.occupancy_hour` → `HOUR()` | Thiếu SQL pair `GROUP BY HOUR(occupancy_hour)` |
| Q007 | `fct_parking_occupancy` JOIN `dim_parking_lot.area_id` | AI không biết cách join occupancy với area |
| Q011 | `fct_vehicle_events.lane_in_name` | AI không map "làn" → `lane_in_name` field |
| Q017 | `fct_parking_occupancy.area_id` | Cùng vấn đề với Q007 |
| Q025 | `dim_date.is_weekend` (boolean) JOIN `fct_vehicle_events` | AI không biết dùng `is_weekend` field |

### Nhóm 2: Camera offline (Q053, Q056, Q114) — DATA CÓ, thiếu SQL pair

- Pattern cần: `MAX(eventTime) < NOW() - INTERVAL 'N' HOUR`
- AI có SQL pair cho "bao nhiêu camera đang hoạt động" (Q058 PASS) nhưng không có pair "camera không gửi dữ liệu trong N giờ"
- Q064 (Chiller không gửi dữ liệu 3 giờ) PASS — chứng tỏ chiller có pair nhưng camera chưa có

### Nhóm 3: So sánh 2 kỳ (Q045, Q113, Q127) — DATA CÓ, thiếu SQL pair

- Q045: So sánh điện tháng này vs tháng trước — pattern CTE CURRENT_MONTH/PREV_MONTH chưa có
- Q113, Q127: Khu vực C tháng trước — kết hợp 2 điều kiện: `asset_label LIKE '%C%'` + tháng trước
- Q010 (Doanh thu tháng trước) PASS — chứng tỏ `dim_date` filter tháng trước hoạt động được

### Nhóm 4: Phân bố / Multi-dimension (Q082, Q085, Q092) — DATA CÓ, thiếu SQL pair

- Q081 (đếm camera) PASS nhưng Q082 (phân bố camera theo tòa) FAIL
- Q037 (device theo asset_type) PASS nhưng Q085 (device theo type VÀ tòa) FAIL
- Pattern thiếu: `GROUP BY device_type, asset_name` 2 dimension cùng lúc

### Nhóm 5: 8 câu cần XÓA — DATA KHÔNG CÓ / KHÔNG THỂ QUERY

| ID | Lý do xóa | Xác nhận từ |
|----|----------|------------|
| Q107 | Không có device_type = ELEVATOR/LIFT trong dim_device | starrock_schema.json + dim_device data |
| Q136 | Duplicate của Q107 | dim_device scan |
| Q122 | BMS_WATER_TANK_* có trong dim_device nhưng telemetry chỉ trong JSON blob | raw_dmp_tlm_raw schema |
| Q128 | Cùng vấn đề WATER_TANK — json_extract không hỗ trợ | DataFusion limitation |
| Q134 | CO2 ppm chỉ trong JSON blob (raw_dmp_tlm_raw.telemetry) | coverage_gaps.md |
| Q140 | Cùng vấn đề CO2_SENSOR — không thể extract JSON | DataFusion limitation |
| Q141 | Engine báo lỗi `Invalid function 'json_extract'` — xác nhận bằng test thực tế | auto_results.json |
| Q139 | Face Terminal không tồn tại trong dim_device hoặc bất kỳ bảng nào | dim_device scan |

---

## 4. Dashboard vs Queries — So sánh thực tế

Dashboard có 4 tab: Environmental, Social, Governance, Parking Lot Occupancy.  
Screenshots chụp lúc: 2026-06-19T02:58 – 03:00 UTC.

### 4A — Dashboard widgets CÓ query PASS tương ứng ✅

| Widget | Dashboard | Test Q | Nhận xét |
|--------|-----------|--------|---------|
| K2: Digital Payment % | 99.1% | Q004 PASS | Q004 breakdown theo loại, dashboard tổng hợp digital vs non-digital |
| K3: Total Energy kWh | 744,300 kWh | Q043, Q078 PASS | Dashboard window = 3 ngày, Q043 = tháng; metric khác nhau |
| K5: Active Parked Vehicles | 1,310 | Q005 PASS | Match — `fct_parking_occupancy.current_occupancy` |
| E1: Daily Energy & Water | Dual line chart | Q041 + Q048 PASS | Dashboard combo, test hỏi riêng lẻ |
| E3: Power Factor by Device | Table | Q047 PASS | Q047 query `power_active_kw`, E3 hiện cả `power_factor` |
| E4: Vehicle Type Distribution | Pie chart | Q022 PASS | Q022 per-lot, E4 aggregate toàn hệ thống |
| E5: Avg Parking Duration | Horizontal bar | Q008 PASS | Match hoàn toàn |
| S1: Digital Payment Adoption | Pie chart | Q004 PASS | Match |
| S2: Revenue by Vehicle Type | Bar chart | Q012, Q018 PASS | Match |
| S5: Revenue by Payment Channel | Pie chart | Q021 PASS | Match |
| S7: Parking Lot Utilization | Bar chart | Q016, Q020 PASS | Q016 dùng area_id |
| Smart Meter Deployment count | KPI | Q076 PASS | Q076 chỉ đếm, không list tên |

### 4B — Dashboard widgets KHÔNG có query PASS ❌ (Critical Gaps)

| Widget | Tab | Test Q | Trạng thái | Mức độ nghiêm trọng |
|--------|-----|--------|-----------|---------------------|
| **E2: Hourly Power Demand Profile** | Environmental | Q044 | **FAIL** (DATE_PART error) | 🔴 Critical — chart xuất hiện đầu tiên |
| **S4: Hourly Parking Demand** | Social | Q006 | **FAIL** (GENERAL) | 🔴 Critical — chart quan trọng tab Social |
| **K1: EV Penetration Rate** | Tất cả tab | **Không có** | **Không test** | 🟡 Thiếu câu hỏi hoàn toàn |
| Parking Occupancy hourly chart | Parking tab | Q007, Q017 | **FAIL** (GENERAL) | 🟡 Medium |
| All Data Flashcards (long table) | Governance | **Không có** | **Không test** | 🟢 Low |

### 4C — Query PASS chưa có widget trên dashboard (Tiềm năng)

| Test Q | Câu hỏi | Gợi ý widget |
|--------|---------|-------------|
| Q003 | Bãi xe doanh thu cao nhất | Leaderboard card |
| Q009, Q023 | Số lượt xe theo tuần / xu hướng loại xe | Trend line chart |
| Q010 | Doanh thu tháng trước (MoM) | KPI với % change |
| Q029/Q030 | Số camera / đếm thiết bị theo loại | Device inventory panel |
| Q058 | Số camera đang hoạt động | KPI "Active Cameras" |
| Q061/Q062 | Chiller fault / đang chạy | BMS status cards |
| Q066/Q067/Q068 | Thiết bị offline / mất kết nối / tỷ lệ online | Status overview panel |
| Q070/Q093 | Camera online theo tòa nhà | Heatmap / grouped bar |
| Q051/Q052/Q055/Q057 | Camera/NVR CPU+RAM health | Health monitoring panel |
| Q071 | Thiết bị mất kết nối nhiều nhất 14 ngày | Maintenance alert list |
| Q073 | Thiết bị quality score thấp | Alert table |
| Q090 | Loại thiết bị offline % cao nhất | Governance metric |

---

## 5. Action Items — Ưu tiên theo impact

### 🔴 Ưu tiên 1: Fix dashboard gaps (Cao nhất)

**A1. Hourly energy query — fix Q044 (E2 dashboard widget)**
- Vấn đề: AI dùng `DATE_PART()` / `DAYOFWEEK()` không hỗ trợ trong DataFusion
- Fix: Thêm SQL pair dùng `HOUR(tsDt)` hoặc `EXTRACT(HOUR FROM eventTime)`:
```sql
SELECT HOUR(tsDt) AS hour_of_day, AVG(power_active_kw) AS avg_kw, MAX(power_active_kw) AS peak_kw
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
GROUP BY HOUR(tsDt)
ORDER BY 1
```
- Files: `sql_pairs_telemetry.yml`, `instructions.yml` (cấm `DATE_PART`, `DAYOFWEEK`)

**A2. Hourly parking demand — fix Q006 (S4 dashboard widget)**
- Vấn đề: AI không biết field `occupancy_hour` trong `fct_parking_occupancy`
- Fix: Thêm SQL pair:
```sql
SELECT HOUR(occupancy_hour) AS hour_of_day, SUM(vehicles_in) AS total_vehicles_in
FROM sdp_mart_fct_parking_occupancy
GROUP BY HOUR(occupancy_hour)
ORDER BY 1
```
- Files: `sql_pairs_parking.yml`

**A3. Thêm câu hỏi EV Penetration (K1 KPI)**
- Chưa có test question nào về "tỷ lệ xe điện"
- Câu hỏi cần thêm: "Tỷ lệ xe điện (EV) trong tổng số giao dịch tháng này là bao nhiêu %?"
- Data source: `fct_vehicle_events.vehicle_type` IN ('eCar', 'eBicycle', 'eMotorbike')

---

### 🟡 Ưu tiên 2: Fix schema instruction errors

**B1. Cấm `LAST_DAY()` — sửa instructions.yml**
- Lỗi quan sát: `Invalid function 'last_day'`
- Fix: Thêm vào `cast_type_rules`: *"KHÔNG dùng LAST_DAY(). Dùng DATE_SUB + DATE_FORMAT + join dim_date."*

**B2. Cấm window function trong HAVING — sửa instructions.yml**
- Fix: Thêm cảnh báo: *"Window functions OVER() chỉ dùng trong SELECT list, KHÔNG trong HAVING."*

**B3. Cảnh báo dim_device_asset KHÔNG có cột SCD — fix Q069**
- Lỗi: AI dùng `event_dbt_valid_to` không tồn tại trên `stg_dmp_device_status_events`
- Fix: Thêm instruction: *"dim_device_asset KHÔNG có dbt_valid_to/dbt_valid_from. Các cột SCD-2 CHỈ có trên dim_device_asset_snapshot."*

**B4. Clarify camelCase deviceId — fix Q054, Q075**
- Q054: alias sai (`t.deviceId`) → thêm SQL pair rõ alias camera
- Q075: dùng `device_id` → phải dùng `deviceId` trong telemetry tables

---

### 🟢 Ưu tiên 3: Thêm SQL pairs cho các pattern phổ biến

**C1. Camera offline pattern — fix Q053, Q056, Q114**
```sql
SELECT d.device_name, MAX(c.eventTime) AS last_seen
FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
GROUP BY d.device_name
HAVING MAX(c.eventTime) < NOW() - INTERVAL '24' HOUR
```

**C2. So sánh 2 kỳ (tháng này vs tháng trước) — fix Q045, Q113, Q127**
```sql
WITH current_month AS (
  SELECT SUM(MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total)) AS kwh
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE tsDt >= DATE_FORMAT(NOW(), '%Y-%m-01')
),
prev_month AS (
  SELECT SUM(MAX(energy_active_kwh_total) - MIN(energy_active_kwh_total)) AS kwh
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter
  WHERE tsDt >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
    AND tsDt < DATE_FORMAT(NOW(), '%Y-%m-01')
)
SELECT current_month.kwh AS this_month, prev_month.kwh AS last_month FROM current_month, prev_month
```

**C3. Top thiết bị tiêu thụ nước — fix Q049**
```sql
SELECT d.device_name, MAX(e.water_volume_m3_total) - MIN(e.water_volume_m3_total) AS water_consumed_m3
FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
WHERE e.tsDt >= DATE_FORMAT(NOW(), '%Y-%m-01')
GROUP BY d.device_name
ORDER BY water_consumed_m3 DESC
LIMIT 5
```

**C4. Offline reason — fix Q074**
```sql
SELECT offlinereason, COUNT(*) AS occurrence_count
FROM sdp_staging_stg_dmp_evt_connectivity
WHERE ts >= NOW() - INTERVAL '7' DAY
  AND status = 'OFFLINE'
GROUP BY offlinereason
ORDER BY occurrence_count DESC
```

**C5. 2D grouping camera theo tòa — fix Q082, Q085**
```sql
SELECT a.asset_name AS building, d.device_type, COUNT(d.device_id) AS count
FROM sdp_golden_dim_device d
JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
JOIN sdp_golden_dim_asset a ON da.asset_name = a.asset_name AND a.asset_type = 'building'
GROUP BY a.asset_name, d.device_type
ORDER BY a.asset_name, count DESC
```

**C6. Weekend vs weekday revenue — fix Q025**
```sql
SELECT 
  CASE WHEN d.is_weekend THEN 'Weekend' ELSE 'Weekday' END AS day_type,
  SUM(e.amount_due) AS total_revenue,
  COUNT(*) AS transaction_count
FROM sdp_golden_fct_vehicle_events e
JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
WHERE e.history_state = 'COMPLETED'
GROUP BY d.is_weekend
```

---

### 🗑️ Ưu tiên 4: Xóa 8 câu hỏi không hợp lệ

| ID | Câu hỏi | Lý do xóa |
|----|---------|----------|
| Q107 | Thang máy đang bảo trì hoặc hỏng? | ELEVATOR/LIFT không tồn tại trong dim_device |
| Q136 | Thang máy đang bảo trì hoặc hỏng? (duplicate Q107) | Cùng lý do + duplicate |
| Q122 | Mực nước bồn WATER_TANK_LEVEL hiện tại? | Telemetry chỉ trong JSON blob, không thể query |
| Q128 | WATER_TANK_LEVEL giảm bất thường? | Cùng lý do |
| Q134 | Khu vực nào có CO2 cao nhất? | CO2 ppm chỉ trong JSON blob |
| Q140 | CO2_SENSOR khu vực A vượt ngưỡng? | Cùng lý do |
| Q141 | CO2_SENSOR > 1000 ppm? | Engine báo `Invalid function 'json_extract'` — xác nhận bằng test |
| Q139 | Face Terminal đang bảo trì? | Face Terminal không có trong bất kỳ bảng nào |

---

## 6. Câu hỏi mơ hồ — Cần bổ sung test case

| ID | Câu gốc | Thiếu test case nào |
|----|---------|---------------------|
| Q006 | Giờ cao điểm đỗ xe? | Chưa test: giờ cao điểm theo từng bãi; giờ cao điểm cuối tuần vs thường |
| Q025 | Doanh thu cuối tuần vs ngày thường? | Chưa test: so sánh từng bãi xe riêng; filter tháng cụ thể |
| Q011 | Làn vào bận nhất? | Chưa test: làn ra (lane_out_name); làn theo bãi cụ thể |
| Q045 | So sánh điện tháng này vs tháng trước? | Chưa test: so sánh theo tòa nhà; so sánh 3 tháng liên tiếp |
| Q092 | Tỷ lệ online theo device_type và tòa nhà? | Câu quá rộng — nên tách thành 2 câu riêng |
| Q100 | Tổng quan hệ thống (mega-query) | Câu quá rộng — nên tách thành 4 câu KPI riêng |
| Q144 | Uptime Hikvision camera? | Hikvision ≡ device_name LIKE 'TNP_HIK%' — chưa có instruction này |
| Q145, Q146 | Multi-turn follow-up | Cần test thủ công trên UI với đúng session context |

---

## 7. Nhận xét tổng thể

### Điểm mạnh
- **Parking domain**: 19/25 câu PASS (76%) — SQL pair parking phong phú và đa dạng
- **Device & Asset catalog**: 14/15 câu PASS (93%) — dim_device/dim_asset được mô tả tốt
- **Telemetry basics**: Các câu hỏi đơn giản (top CPU, max energy, avg chiller_state) đều PASS
- **Multi-condition**: Q097 (camera online + CPU>80% + tòa nhà), Q099 (chiller fault + offline) — PASS — AI xử lý được AND condition phức tạp
- **Boundary cases**: Q148 (thời tiết), Q149 (empty) xử lý đúng — hệ thống stable

### Điểm yếu
- **Hourly aggregation**: `HOUR(col)` pattern hoàn toàn thiếu SQL pair → 3+ câu liên quan fail
- **2-period comparison**: CTE tháng này vs tháng trước thiếu → 3 câu fail
- **Camera offline**: `MAX(eventTime) < NOW() - INTERVAL` thiếu cho camera → 3 câu fail (chiller có, camera không)
- **DATE functions**: AI tự dùng `DATE_PART()`, `DAYOFWEEK()`, `LAST_DAY()` — đều không hỗ trợ
- **camelCase inconsistency**: `deviceId` vs `device_id` gây schema error trực tiếp (Q054, Q075)
- **JSON telemetry**: CO2, Water Tank chỉ có trong JSON blob — DataFusion không hỗ trợ json_extract → 5+ câu không thể fix

### Tỷ lệ FAIL thực sự (sau khi loại trừ câu không hợp lệ)

- 8 câu xóa: 149 - 8 = **141 câu hợp lệ**
- 34 câu FAIL còn lại từ 141 = **24.1% FAIL**
- Tiềm năng fix được thêm ~30 câu → mục tiêu: **≥85% PASS sau fix**

---

## 8. Tổng hợp việc cần làm

| # | Hạng mục | File cần sửa | Tác động |
|---|----------|-------------|---------|
| 1 | SQL pair `HOUR(tsDt)` hourly energy | `sql_pairs_telemetry.yml` | Fix Q044, fix E2 dashboard |
| 2 | SQL pair `HOUR(occupancy_hour)` hourly parking | `sql_pairs_parking.yml` | Fix Q006, fix S4 dashboard |
| 3 | SQL pair camera offline `MAX(eventTime)` | `sql_pairs_telemetry.yml` | Fix Q053, Q056, Q114 |
| 4 | SQL pair 2-period comparison | `sql_pairs_telemetry.yml` | Fix Q045, Q113, Q127 |
| 5 | SQL pair top water device | `sql_pairs_telemetry.yml` | Fix Q049, Q109 |
| 6 | SQL pair weekend vs weekday | `sql_pairs_parking.yml` | Fix Q025 |
| 7 | SQL pair camera phân bố 2D | `sql_pairs_telemetry.yml` | Fix Q082, Q085, Q092 |
| 8 | SQL pair offlinereason | `sql_pairs_dmp.yml` | Fix Q074 |
| 9 | Instruction cấm LAST_DAY(), DATE_PART(), DAYOFWEEK() | `instructions.yml` (cast_type_rules) | Prevent Q044-type errors |
| 10 | Instruction cảnh báo SCD columns chỉ trên snapshot | `instructions.yml` (device_status_filter) | Fix Q069 |
| 11 | Clarify camelCase deviceId trong camera table | `instructions.yml` + sql_pairs | Fix Q054, Q075 |
| 12 | Xóa 8 câu không hợp lệ | `question_test.md` | Remove noise từ test suite |
| 13 | Thêm câu hỏi EV Penetration rate | `question_test.md` | Fix K1 dashboard gap |

**Sau khi apply:** Chạy lại `python database/scripts/run_question_tests.py --all` ít nhất 2 lần để xác nhận (có flakiness run-to-run).
