# Fail Questions — Wren AI Test Report

> **Ngày test:** 2026-06-19  
> **Tổng:** 149 câu | **PASS:** 107 (72%) | **FAIL:** 42 (28%)  
> **URL:** http://74.48.140.178:27668/home

---

## Phân loại nguyên nhân FAIL

| Loại | Số câu | Mô tả |
|------|--------|--------|
| **GENERAL** | 37 | AI trả lời text thay vì sinh SQL |
| **NO_RELEVANT_SQL** | 5 | AI sinh SQL nhưng schema field bị sai |

---

## LOẠI A — AI trả lời GENERAL (không sinh SQL)

> AI hiểu câu hỏi nhưng không tìm được SQL mapping phù hợp, trả về text thay vì query.

---

### 🅐1 Parking — Real-time / Occupancy (5 câu)

| ID | Câu hỏi | Nghi vấn |
|----|---------|---------|
| **Q006** | Giờ cao điểm đỗ xe trong ngày là mấy giờ? | Thiếu bảng aggregation theo giờ |
| **Q007** | Occupancy hiện tại theo từng khu vực (area)? | "khu vực" có thể không map đúng field |
| **Q011** | Làn vào nào bận nhất trong tuần này? | "Làn vào" (lane) có thể không có trong schema |
| **Q017** | So sánh lượng xe đang đỗ theo từng khu vực? | Tương tự Q007 |
| **Q025** | Doanh thu cuối tuần cao hơn ngày thường bao nhiêu %? | Cần logic WEEKDAY/WEEKEND không có sẵn |

**Gợi ý fix:** Thêm SQL pair mẫu cho "giờ cao điểm" dùng `HOUR(check_in_at)` + GROUP BY; clarify field "lane" trong description.

---

### 🅐2 Parking — Trend (1 câu)

| ID | Câu hỏi | Nghi vấn |
|----|---------|---------|
| **Q023** | Xu hướng số lượng xe theo loại trong 3 tháng gần nhất? | Câu hỏi tương tự Q021 (PASS) nhưng dùng "số lượng" thay "doanh thu" |

**Gợi ý fix:** Thêm SQL pair về `COUNT(*)` theo vehicle_type + DATE_TRUNC month.

---

### 🅐3 Asset / Building Count (3 câu)

| ID | Câu hỏi | Nghi vấn |
|----|---------|---------|
| **Q026** | Hệ thống có bao nhiêu tòa nhà? | Khác Q028 (PASS: "danh sách") — COUNT khác LIST |
| **Q027** | Số lượng từng loại asset (building, floor, zone, parking, equipment)? | Câu dài, nhiều loại cùng lúc |
| **Q035** | Vị trí nào có nhiều thiết bị nhất? | Tương tự Q038 (PASS) nhưng hỏi TOP 1 |

**Gợi ý fix:** Thêm SQL pair: `SELECT asset_type, COUNT(*) FROM dim_asset GROUP BY asset_type`.

---

### 🅐4 Telemetry — So sánh 2 kỳ / Device unknown (2 câu)

| ID | Câu hỏi | Nghi vấn |
|----|---------|---------|
| **Q045** | So sánh tiêu thụ điện tháng này so với tháng trước? | Cần logic 2 period — có thể AI không biết cách dùng |
| **Q049** | Thiết bị nào tiêu thụ nước nhiều nhất tháng này? | Q048 (tổng nước) PASS nhưng Q049 (top device nước) FAIL |

**Gợi ý fix:** Thêm SQL pair "so sánh tháng này vs tháng trước" với CTE CURRENT/PREVIOUS MONTH.

---

### 🅐5 Camera — Offline detection (3 câu)

| ID | Câu hỏi | Nghi vấn |
|----|---------|---------|
| **Q053** | Camera nào không gửi dữ liệu trong 1 giờ qua? | Q056 (24h) cũng FAIL — pattern "không gửi dữ liệu" không map được |
| **Q056** | Camera nào không gửi dữ liệu trong 24 giờ qua (có thể offline)? | Tương tự Q053 |
| **Q114** | Danh sách camera không gửi dữ liệu trong 24 giờ qua? | Cùng pattern nhưng batch 12 |

**Gợi ý fix:** Thêm SQL pair về "last_seen > N hours" dùng `MAX(eventTime) < NOW() - INTERVAL 'N' HOUR`.

---

### 🅐6 Chiller — Multi-condition (1 câu)

| ID | Câu hỏi | Nghi vấn |
|----|---------|---------|
| **Q063** | Chiller nào đang chạy nhưng đồng thời báo fault? | AND condition giữa 2 trạng thái — Q061/Q062 riêng lẻ đều PASS |

**Gợi ý fix:** Thêm SQL pair về `chiller_state=1 AND fault=1` dùng subquery.

---

### 🅐7 DMP Status — Uptime / Distribution phức tạp (6 câu)

| ID | Câu hỏi | Nghi vấn |
|----|---------|---------|
| **Q074** | Lý do offline phổ biến nhất trong tuần qua? | Field "reason" của offline event không được map |
| **Q080** | Tỷ lệ uptime tổng thể của toàn bộ thiết bị IoT? | Q069 FAIL schema + Q080 FAIL GENERAL — uptime calc khó |
| **Q082** | Phân bố camera giám sát theo từng tòa nhà? | Q081 (count) PASS nhưng Q082 (phân bố) FAIL |
| **Q085** | Phân bố thiết bị IoT theo loại thiết bị và tòa nhà? | 2 dimension grouping cùng lúc |
| **Q092** | Tỷ lệ online theo từng loại thiết bị và từng tòa nhà? | 3 dimension grouping |
| **Q100** | Tổng quan hệ thống: thiết bị + online + điện + parking? | Dashboard query — quá nhiều metric một lúc |

**Gợi ý fix:** Tách câu Q100 thành 4 câu riêng; thêm SQL pair 2D/3D grouping.

---

### 🅐8 SQL Pairs — Raw transactions / Thang máy (4 câu)

| ID | Câu hỏi | Nghi vấn |
|----|---------|---------|
| **Q104** | Có bao nhiêu giao dịch raw chưa được xử lý trong 7 ngày qua? | "raw" table có thể không được index trong metadata |
| **Q105** | Bãi đỗ nào có nhiều giao dịch raw nhất hôm nay? | Tương tự Q104 |
| **Q107** | Danh sách các thang máy đang bảo trì hoặc hỏng? | "ELEVATOR/LIFT" device_type có thể không có trong schema |
| **Q136** | Danh sách thang máy đang bảo trì hoặc hỏng? | Cùng vấn đề với Q107 (duplicate pattern) |

**Gợi ý fix:** Xác nhận device_type của thang máy trong `dim_device`; thêm description cho raw table.

---

### 🅐9 Telemetry — "Khu vực C" vague (2 câu)

| ID | Câu hỏi | Nghi vấn |
|----|---------|---------|
| **Q113** | Số liệu và xu hướng tiêu thụ điện tháng trước khu vực C? | Q112 (top khu vực) PASS nhưng "khu vực C" cụ thể FAIL |
| **Q127** | Số liệu và xu hướng điện tháng trước – khu vực C? | Giống Q113 (duplicate) |

**Gợi ý fix:** Thêm SQL pair về filter `WHERE asset_label LIKE '%C%'` hoặc clarify mapping "khu vực" → `area_id`.

---

### 🅐10 AC.xlsx — Thiếu telemetry table (7 câu)

> Các device type này không có bảng telemetry riêng trong schema.

| ID | Câu hỏi | Device không có telemetry |
|----|---------|--------------------------|
| **Q122** | Mực nước bồn WATER_TANK_LEVEL hiện tại? | WATER_TANK_LEVEL — không có bảng |
| **Q128** | WATER_TANK_LEVEL có giảm bất thường 3 ngày qua? | WATER_TANK_LEVEL — không có bảng |
| **Q134** | Khu vực nào có nồng độ CO2 cao nhất hiện tại? | CO2 ppm — không có bảng riêng |
| **Q138** | Tất cả thiết bị đang Error hoặc Maintenance? | Union nhiều device type — AI từ chối |
| **Q139** | Face Terminal nào đang bảo trì? | Face Terminal có thể không có trong dim_device |
| **Q140** | CO2_SENSOR tại khu vực A có vượt ngưỡng không? | CO2 ppm — không có bảng riêng |
| **Q144** | Tỷ lệ uptime Hikvision camera trong tháng? | "Hikvision" là brand/model — không có field filter |

**Gợi ý fix:** Bổ sung telemetry tables cho WATER_TANK, CO2 ppm; hoặc thêm instruction "Wren AI không có dữ liệu WATER_TANK".

---

### 🅐11 Multi-turn Context (2 câu)

| ID | Câu hỏi | Vấn đề |
|----|---------|--------|
| **Q145** | Còn tầng 5 thì sao? (context: CO2 tầng 3) | AI không kế thừa "tòa nhà A" + "CO2" từ thread context |
| **Q146** | Còn top nước thì sao? (context: top điện) | AI không kế thừa "30 ngày" + N=5 từ thread context |

**Gợi ý fix:** Multi-turn context cần được test bằng tay trực tiếp trên UI (script không truyền đủ history messages).

---

## LOẠI B — NO_RELEVANT_SQL (Schema error)

> AI sinh được SQL nhưng engine Wren báo lỗi vì field hoặc function không tồn tại.

---

| ID | Câu hỏi | Lỗi cụ thể |
|----|---------|------------|
| **Q044** | Xu hướng tiêu thụ điện theo ngày trong tuần này? | `No matching function` — AI dùng DATE_PART/DAYOFWEEK không hỗ trợ trên StarRocks |
| **Q054** | Camera nào có CPU usage vượt 80% hiện tại? | `No field named t."deviceId"` — AI dùng alias sai khi JOIN |
| **Q069** | Tỷ lệ thiết bị đang hoạt động (uptime) toàn hệ thống? | `No field named event_dbt_valid_to` — AI dùng field DBT không có trong schema |
| **Q075** | Danh sách thiết bị không có telemetry trong 24 giờ qua? | `No field named device_id` — AI dùng tên field thay vì `deviceId` (camelCase) |
| **Q141** | Danh sách CO2_SENSOR có giá trị > 1000 ppm? | `Invalid function 'json_extract'` — AI cố parse JSON field không hỗ trợ |

**Gợi ý fix chi tiết:**

- **Q044**: Thêm instruction hoặc SQL pair về StarRocks date functions: `DAYOFWEEK()` → `EXTRACT(DOW FROM ...)` hoặc dùng `DATE_TRUNC('week', ...)`.
- **Q054**: Thêm SQL pair rõ alias: `FROM sdp_near_realtime_stg_mv_dmp_tlm_camera AS cam WHERE cam.cpu_usage_pct > 80`.
- **Q069**: Xóa hoặc remap field `event_dbt_valid_to` trong schema description — field này không tồn tại.
- **Q075**: Clarify trong description: field tên là `deviceId` (camelCase), không phải `device_id`.
- **Q141**: Telemetry CO2 ppm có thể lưu trong JSON column — cần thêm instruction cách parse, hoặc xác nhận không có data.

---

## Tóm tắt theo domain

| Domain | FAIL | Nguyên nhân chính |
|--------|------|------------------|
| Parking (Q001–Q025) | Q006, Q007, Q011, Q017, Q023, Q025 | Real-time occupancy + trend + weekend logic |
| Device & Asset (Q026–Q040) | Q026, Q027, Q035 | COUNT vs LIST; asset type grouping |
| Telemetry (Q041–Q065) | Q044, Q045, Q049, Q053, Q054, Q056, Q063 | Offline detection; 2-period compare; schema alias |
| DMP Status (Q066–Q075) | Q069, Q074, Q075 | Uptime field; offline reason; telemetry lag |
| ISO 37122 (Q076–Q095) | Q080, Q082, Q085 | Distribution queries; uptime calc |
| Cross-domain (Q096–Q100) | Q092, Q100 | Multi-dimension; dashboard mega-query |
| SQL Pairs Bổ Sung (Q101–Q119) | Q104, Q105, Q107, Q109, Q113, Q114 | Raw table; thang máy; camera offline |
| AC.xlsx (Q120–Q149) | Q122, Q127, Q128, Q134, Q136, Q138, Q139, Q140, Q141, Q144, Q145, Q146 | Thiếu table; multi-turn; CO2 ppm |

---

## Action items ưu tiên

**Cao (ảnh hưởng nhiều câu):**
1. Thêm SQL pair về **camera/thiết bị offline** (`MAX(eventTime) < NOW() - INTERVAL`) → fix Q053, Q056, Q114
2. Thêm SQL pair về **so sánh 2 kỳ** (tháng này vs tháng trước) → fix Q045, Q113, Q127
3. Xác nhận **device_type của thang máy** trong dim_device → fix Q107, Q136

**Trung bình (schema/function issues):**
4. Fix field alias `deviceId` vs `device_id` trong camera table description → fix Q054, Q075
5. Thêm instruction về **StarRocks date functions** được hỗ trợ → fix Q044
6. Remove/clarify field `event_dbt_valid_to` trong schema → fix Q069

**Thấp (thiếu data ngoài scope):**
7. Document rõ: WATER_TANK_LEVEL, CO2 ppm, Face Terminal **chưa có telemetry** → Q122, Q128, Q139, Q140
8. Test multi-turn Q145/Q146 lại **bằng tay** trên UI với đúng session
