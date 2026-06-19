# Business Mapping — Text-to-SQL Checklist

Mỗi mục cần được điền đầy đủ trước khi Wren AI có thể trả lời đúng nhóm câu hỏi đó.
Tất cả giá trị enum bên dưới được lấy trực tiếp từ data thực tế trong StarRocks.

Format: `[ ]` chưa làm · `[~]` đang làm · `[x]` hoàn thành

---

## Cách dùng file này

1. Đọc từng nhóm bên dưới — cột **Giá trị thực tế** đã được điền sẵn từ data
2. Với mỗi mục trạng thái `[ ]`: copy nội dung vào file nguồn ở cột **Thêm vào**
3. Chạy `py -3.10 database/scripts/sync_relationships_from_yaml.py` để deploy
4. Đánh dấu `[x]` khi đã deploy và test xong

---

## Nhóm 1 — Enum Values

> Các giá trị phân biệt hoa/thường. LLM phải dùng đúng casing.

### 1A — Bảng `fct_vehicle_events` + `fct_parking_occupancy`

| # | Cột | Giá trị thực tế | Ghi chú nghiệp vụ | Thêm vào | Trạng thái |
|---|---|---|---|---|---|
| 1.1 | `vehicle_type` | `'CAR'`, `'MOTORBIKE'`, `'TRUCK'`, `'EV'` | Tất cả uppercase. "xe máy" = MOTORBIKE, "ô tô" = CAR, "xe điện" = EV | `instructions.yml` → thêm `vehicle_type_values` | [ ] |
| 1.2 | `payment_type` | `'CASH'`, `'CARD'`, `'E_WALLET'`, `'MONTHLY_PASS'` | "ví điện tử" = E_WALLET, "vé tháng" = MONTHLY_PASS, "tiền mặt" = CASH | `instructions.yml` → thêm `payment_type_values` | [ ] |
| 1.3 | `service_category` | `'STANDARD'`, `'VIP'`, `'STAFF'` | Tier dịch vụ. "nhân viên" = STAFF, "thường" = STANDARD | `instructions.yml` → thêm `service_category_values` | [ ] |
| 1.4 | `service_name` | `'Hourly Parking'`, `'Monthly Parking'`, `'Visitor Parking'` | "theo giờ" = Hourly, "tháng" = Monthly, "khách" = Visitor. Lưu ý: có space, viết hoa chữ đầu | `instructions.yml` → thêm `service_name_values` | [ ] |
| 1.5 | `service_id` | `'SVC_01'` đến `'SVC_05'` | ID gói dịch vụ. 5 gói, tất cả map sang 3 service_name ở trên | `descriptions.yml` → column `service_id` | [ ] |
| 1.6 | `history_state` | Chỉ có `'COMPLETED'` trong data hiện tại | Data fake chỉ sinh COMPLETED. Câu query doanh thu KHÔNG cần filter thêm — nhưng nên để filter để đảm bảo khi data thật vào | `instructions.yml` → `completed_events_filter` | [ ] |
| 1.7 | `direction_type` | Chỉ có `'IN_OUT'` trong data hiện tại | Giao dịch hoàn chỉnh (xe vào và ra). Khi data thật có thể xuất hiện thêm giá trị | `descriptions.yml` → column `direction_type` | [ ] |
| 1.8 | `lpn_cmp` | Chỉ có `'MATCH'` trong data hiện tại | Kết quả so khớp biển số. 'MISMATCH' sẽ xuất hiện khi biển số camera đọc sai | `descriptions.yml` → column `lpn_cmp` | [ ] |
| 1.9 | `open_mode_in` / `open_mode_out` | `'AUTO'`, `'MANUAL'` | AUTO = barrier tự mở, MANUAL = bảo vệ mở tay | `descriptions.yml` → column `open_mode_in` và `open_mode_out` | [ ] |
| 1.10 | `use_voucher` | `True` / `False` | ~10% giao dịch dùng voucher (3,104 / 30,000 rows) | `descriptions.yml` → column `use_voucher` | [ ] |
| 1.11 | `entry_point_in_name` | `'Gate In 1'`, `'Gate In 2'`, `'Gate In 3'` | 3 cổng vào. Phân phối đều nhau (~10k mỗi cổng) | `descriptions.yml` → column `entry_point_in_name` | [ ] |
| 1.12 | `entry_point_out_name` | `'Gate Out 1'`, `'Gate Out 2'`, `'Gate Out 3'` | 3 cổng ra | `descriptions.yml` → column `entry_point_out_name` | [ ] |
| 1.13 | `lane_in_name` / `lane_out_name` | `'Lane IN 1'` đến `'Lane IN 6'` / `'Lane OUT 1'` đến `'Lane OUT 6'` | 6 làn mỗi chiều | `descriptions.yml` → column `lane_in_name` | [ ] |

### 1B — Bảng `dim_device` + `stg_dmp_device_status_events`

| # | Cột | Giá trị thực tế | Ghi chú nghiệp vụ | Thêm vào | Trạng thái |
|---|---|---|---|---|---|
| 1.14 | `device_type` (dim_device) | ⚠️ **KHÔNG phải** 'Camera'/'Chiller'/'Energy Meter'/'NVR' như instructions.yml đang ghi. Giá trị thực trong CSV là: `'Hikvision Camera'`, `'Hikvision NVR'`, `'bms-chiller'`, `'bms-co2-sensor'`, `'bms-fcu-fan-coil'`, `'siemens-chiller'`, `'bms-energy-water-meter'`, ... (35+ loại) | **BUG tiềm ẩn:** instructions.yml hiện nói `'Camera'`, `'Chiller'`, `'Energy Meter'`, `'NVR'` nhưng data thực có tên khác. Cần confirm lại sau khi data thật từ DMP được load. Xem thêm Bug 2 trong `bug.md` | `instructions.yml` → sửa `device_type_values` sau khi xác nhận | [~] cần verify |
| 1.15 | `current_status` | `'ONLINE'`, `'OFFLINE'`, `'MAINTENANCE'` | Trạng thái hiện tại của thiết bị | `instructions.yml` → thêm `device_status_values` | [ ] |
| 1.16 | `previous_status` | `'ONLINE'`, `'OFFLINE'`, `'MAINTENANCE'`, `'UNKNOWN'` | UNKNOWN xuất hiện khi thiết bị lần đầu kết nối | `descriptions.yml` → column `previous_status` | [ ] |
| 1.17 | `event_type` | `'STATUS_CHANGE'`, `'STATUS_HEARTBEAT'` | STATUS_CHANGE = thực sự đổi trạng thái; HEARTBEAT = xác nhận định kỳ không đổi | `instructions.yml` → thêm `device_event_type_values` | [ ] |
| 1.18 | `transport_type` | `'MQTT'` (chỉ 1 giá trị trong data hiện tại) | Giao thức kết nối IoT | `descriptions.yml` → column `transport_type` | [ ] |
| 1.19 | `provision_type` | `'DISABLED'` (chỉ 1 giá trị trong data hiện tại) | Chính sách provision thiết bị mới | `descriptions.yml` → column `provision_type` | [ ] |

### 1C — Bảng `dim_asset`

| # | Cột | Giá trị thực tế | Ghi chú nghiệp vụ | Thêm vào | Trạng thái |
|---|---|---|---|---|---|
| 1.20 | `asset_type` | `'building'`, `'floor'`, `'zone'`, `'parking'`, `'equipment'` | **Lowercase** — khác với `asset_profile_name` viết hoa. Dùng lowercase khi filter `asset_type` | `instructions.yml` → thêm `asset_type_values` | [ ] |
| 1.21 | `asset_profile_name` | `'Building'`, `'Floor'`, `'Zone'`, `'Parking'`, `'Equipment'` | **Capitalized** — dùng khi filter qua `dim_asset_profile` | `descriptions.yml` → column `asset_profile_name` | [ ] |

### 1D — Bảng `dim_parking_lot`

| # | Cột | Giá trị thực tế | Ghi chú nghiệp vụ | Thêm vào | Trạng thái |
|---|---|---|---|---|---|
| 1.22 | `pk_lot_id` | `'LOT_001'` đến `'LOT_040'` (40 bãi) | Format: LOT_ + số 3 chữ số. 40 bãi chia đều vào 20 khu vực | `descriptions.yml` → column `pk_lot_id` | [ ] |
| 1.23 | `area_id` | `'AREA_01'` đến `'AREA_20'` (20 khu vực) | Mỗi khu vực có đúng 2 bãi xe | `descriptions.yml` → column `area_id` | [ ] |

---

## Nhóm 2 — KPI Formulas

> Mỗi dòng = một metric nghiệp vụ cần được document để LLM biết tính thế nào.

### 2A — Parking Revenue (Doanh thu bãi xe)

| # | Metric | Câu hỏi ví dụ | Công thức SQL | Filter bắt buộc | Thêm vào | Trạng thái |
|---|---|---|---|---|---|---|
| 2.1 | Tổng doanh thu | "Doanh thu tháng này?" | `SUM(amount_due)` | `history_state = 'COMPLETED'` | `instructions.yml` | [ ] |
| 2.2 | Phí gốc (trước giảm giá) | "Tổng phí đỗ xe thu được?" | `SUM(parking_fee)` | `history_state = 'COMPLETED'` | `instructions.yml` | [ ] |
| 2.3 | Tổng giảm giá | "Bao nhiêu tiền đã giảm?" | `SUM(promotion_amount) + SUM(promotion_vinfast_amount)` | `history_state = 'COMPLETED'` | `instructions.yml` | [ ] |
| 2.4 | Phí thẻ bị mất | "Thu được bao nhiêu phí thẻ thất lạc?" | `SUM(lost_card_fee)` | `lost_card_fee > 0` | `descriptions.yml` → column `lost_card_fee` | [ ] |
| 2.5 | Doanh thu theo loại xe | "So sánh doanh thu xe máy vs ô tô?" | `SUM(amount_due) GROUP BY vehicle_type` | `history_state = 'COMPLETED'` | `instructions.yml` | [ ] |
| 2.6 | Doanh thu theo phương thức thanh toán | "Tỉ lệ tiền mặt vs ví điện tử?" | `SUM(amount_due) GROUP BY payment_type` | `history_state = 'COMPLETED'` | `instructions.yml` | [ ] |

> **Lưu ý về amount_due:** Khoảng 0 – 50,000 VND. Nhiều giao dịch có `amount_due = 0` (xe tháng đã trả trước, hoặc xe được miễn phí). Nên chú thích cho LLM biết điều này.

### 2B — Parking Traffic (Lưu lượng xe)

| # | Metric | Câu hỏi ví dụ | Công thức SQL | Bảng ưu tiên | Thêm vào | Trạng thái |
|---|---|---|---|---|---|---|
| 2.7 | Số giao dịch / ngày | "Bao nhiêu xe vào ra mỗi ngày?" | `COUNT(event_id) GROUP BY event_date` | `fct_vehicle_events` | `instructions.yml` | [ ] |
| 2.8 | Occupancy hiện tại per lot | "Hiện bãi LOT_001 có bao nhiêu xe?" | `current_occupancy` WHERE `occupancy_hour = MAX(occupancy_hour)` per `parking_lot_id` | `fct_parking_occupancy` | `instructions.yml` → `parking_occupancy` | [ ] |
| 2.9 | Tổng occupancy tất cả bãi | "Toàn hệ thống đang có bao nhiêu xe?" | `SUM(current_occupancy)` tại slot mới nhất mỗi bãi | `fct_parking_occupancy` | `instructions.yml` | [ ] |
| 2.10 | Giờ cao điểm vào | "Giờ nào đông xe vào nhất?" | `SUM(vehicles_in) GROUP BY occupancy_time_key ORDER BY 1 DESC` | `fct_parking_occupancy` JOIN `dim_time` | `instructions.yml` | [ ] |
| 2.11 | Thời gian đỗ trung bình (phút) | "Xe đỗ trung bình bao nhiêu phút?" | `AVG(park_duration_ms) / 60000` | `fct_vehicle_events` | `instructions.yml` | [ ] |
| 2.12 | Utilization rate (%) | "Tỉ lệ lấp đầy bãi?" | **BLOCKED** — cần cột `total_capacity` chưa có | — | Xem Gap 7.1 | [ ] |

> **Về occupancy:** `current_occupancy` max = 5–7 xe / bãi / slot trong data fake. `vehicles_in` max = 3 xe / slot 1 giờ. Đây là data synthetic — số thực tế từ DMP sẽ lớn hơn.

### 2C — Device Health (Sức khỏe thiết bị)

| # | Metric | Câu hỏi ví dụ | Công thức SQL | Bảng chính | Thêm vào | Trạng thái |
|---|---|---|---|---|---|---|
| 2.13 | Uptime % theo thiết bị | "Camera nào có uptime thấp nhất?" | `COUNT(*) FILTER (WHERE is_online = TRUE) * 100.0 / COUNT(*)` GROUP BY `device_id` | `stg_dmp_device_status_events` | `instructions.yml` | [ ] |
| 2.14 | Số thiết bị đang online | "Hiện có bao nhiêu thiết bị online?" | `COUNT(DISTINCT device_id) WHERE current_status = 'ONLINE'` tại event mới nhất per device | `stg_dmp_device_status_events` | `instructions.yml` | [ ] |
| 2.15 | Thiết bị offline nhiều nhất | "Device nào hay mất kết nối nhất?" | `COUNT(*) WHERE event_type='STATUS_CHANGE' AND current_status='OFFLINE'` GROUP BY `device_id` | `stg_dmp_device_status_events` | `instructions.yml` | [ ] |
| 2.16 | Tỉ lệ online theo loại thiết bị | "Camera vs NVR: loại nào ổn định hơn?" | JOIN `dim_device` để lấy `device_type`, GROUP BY `device_type` | `stg_dmp_device_status_events` JOIN `dim_device` | `instructions.yml` | [ ] |

### 2D — Energy / Telemetry

| # | Metric | Câu hỏi ví dụ | Công thức SQL | Bảng chính | Thêm vào | Trạng thái |
|---|---|---|---|---|---|---|
| 2.17 | Tiêu thụ điện hiện tại | "Công suất tiêu thụ lúc này?" | `AVG(power_active_kw)` tại timestamp mới nhất | `stg_mv_dmp_tlm_energy_meter` | `instructions.yml` | [ ] |
| 2.18 | Tổng điện tiêu thụ (kWh) | "Tiêu thụ điện hôm nay?" | MAX(`energy_active_kwh_total`) - MIN(`energy_active_kwh_total`) trong ngày (cumulative counter) | `stg_mv_dmp_tlm_energy_meter` | `instructions.yml` | [ ] |
| 2.19 | CPU usage camera | "Camera nào đang dùng CPU cao?" | `SELECT deviceId, AVG(cpu_usage_pct)` GROUP BY `deviceId` ORDER BY 2 DESC | `stg_mv_dmp_tlm_camera` | `instructions.yml` | [ ] |
| 2.20 | Chiller đang bật | "Bao nhiêu chiller đang chạy?" | `COUNT(*) WHERE chiller_state = TRUE` tại ts mới nhất per device | `stg_mv_dmp_tlm_chiller` | `instructions.yml` | [ ] |

---

## Nhóm 3 — Filter Rules (quy tắc lọc bản ghi hợp lệ)

| # | Pattern | Ý nghĩa | Filter SQL | Bảng áp dụng | Thêm vào | Trạng thái |
|---|---|---|---|---|---|---|
| 3.1 | Giao dịch hoàn chỉnh | Xe đã vào và ra, có tính phí | `WHERE history_state = 'COMPLETED'` | `fct_vehicle_events` | `instructions.yml` → `completed_events_filter` | [ ] |
| 3.2 | Xe đang đỗ (chưa ra) | Bỏ qua khi tính doanh thu, dùng khi đếm xe đang trong bãi | `WHERE check_out_at IS NULL` | `fct_vehicle_events` | `descriptions.yml` → column `check_out_at` | [ ] |
| 3.3 | SCD-2 bản ghi hiện tại | Lấy assignment / snapshot đang active | `WHERE dbt_valid_to IS NULL` hoặc `WHERE dbt_valid_to = ''` | `dim_device_asset_snapshot`, `dim_parking_lot_snapshot` | `descriptions.yml` → column `dbt_valid_to` | [x] đã có |
| 3.4 | Occupancy snapshot mới nhất | Trạng thái đỗ xe hiện tại | `WHERE occupancy_hour = (SELECT MAX(occupancy_hour) FROM fct_parking_occupancy WHERE parking_lot_id = ...)` | `fct_parking_occupancy` | `instructions.yml` → `parking_occupancy` | [ ] |
| 3.5 | Telemetry mới nhất per device | Trạng thái thiết bị hiện tại | `ORDER BY ts DESC LIMIT 1` per `deviceId` (dùng ROW_NUMBER() hoặc subquery) | Tất cả `stg_mv_dmp_tlm_*` | `instructions.yml` → thêm `latest_telemetry_pattern` | [ ] |
| 3.6 | Chỉ event status change (không heartbeat) | Đếm số lần đổi trạng thái thực sự | `WHERE event_type = 'STATUS_CHANGE'` | `stg_dmp_device_status_events` | `instructions.yml` → `device_event_type_values` | [ ] |
| 3.7 | Giao dịch có phát sinh phí | Chỉ lấy xe trả tiền (exclude vé tháng đã trả) | `WHERE amount_due > 0` | `fct_vehicle_events` | `instructions.yml` | [ ] |
| 3.8 | Giao dịch dùng voucher | Phân tích hiệu quả voucher | `WHERE use_voucher = TRUE` | `fct_vehicle_events` | `descriptions.yml` → column `use_voucher` | [ ] |

---

## Nhóm 4 — Disambiguation Rules

> Khi nhiều bảng có thể trả lời cùng một câu hỏi — LLM phải chọn đúng bảng.

| # | Câu hỏi dạng | Bảng ĐÚNG | Bảng hay nhầm | Lý do chọn đúng | Thêm vào | Trạng thái |
|---|---|---|---|---|---|---|
| 4.1 | "Bao nhiêu xe đang đỗ?" | `fct_parking_occupancy` | `fct_vehicle_events` | `fct_parking_occupancy` đã pre-aggregate theo giờ. Dùng `fct_vehicle_events` phải tự tính `IN - OUT` qua nhiều bước phức tạp | `descriptions.yml` → `fct_vehicle_events` (note "Do NOT compute occupancy") | [~] có 1 phần |
| 4.2 | "Device đang ở asset nào hiện tại?" | `dim_device_asset` | `dim_device_asset_snapshot` | `dim_device_asset` = current-state. Snapshot chỉ dùng cho câu hỏi historical ("trước đây device X ở đâu?") | `descriptions.yml` cả 2 bảng | [~] có 1 phần |
| 4.3 | "Thiết bị nào đang online?" | `stg_dmp_device_status_events` | `stg_dmp_evt_connectivity` | `status_events` có derived field `is_online` (boolean). `connectivity` là raw heartbeat timestamp — phải tự parse `status` string | `descriptions.yml` → `stg_dmp_evt_connectivity` note "lower-level than status_events" | [ ] |
| 4.4 | "Thông tin thiết bị" | `dim_device` | `stg_dmp_devices` | `dim_device` = golden, đã denormalize profile name. `stg_dmp_devices` cần thêm JOIN với `stg_dmp_device_profiles` | `descriptions.yml` → `stg_dmp_devices` note "prefer dim_device" | [~] có 1 phần |
| 4.5 | "Lịch sử phân công device theo thời gian" | `dim_device_asset_snapshot` | `dim_device_asset` | `dim_device_asset` chỉ có current state. Snapshot có `dbt_valid_from` / `dbt_valid_to` để trace lịch sử | `descriptions.yml` → `fct_device_asset_assignment` | [ ] |
| 4.6 | "Thông tin bãi xe hiện tại" | `dim_parking_lot` | `dim_parking_lot_snapshot` | `dim_parking_lot` = current. Snapshot dùng cho point-in-time (bãi trước đây tên gì) | `descriptions.yml` → `dim_parking_lot_snapshot` note "use dim_parking_lot for current" | [~] có 1 phần |
| 4.7 | "Số lượng / danh sách bãi xe" | `dim_parking_lot` | `fct_parking_occupancy` | `dim_parking_lot` là dimension master (40 bãi). `fct_parking_occupancy` có thể bị missing bãi chưa có event | `descriptions.yml` → `fct_parking_occupancy` | [ ] |
| 4.8 | "Thông tin asset (tòa nhà, tầng, khu)" | `dim_asset` | `stg_dmp_assets` | `dim_asset` = golden denormalized. Staging cần JOIN thêm | `descriptions.yml` → `stg_dmp_assets` | [~] có 1 phần |

---

## Nhóm 5 — Vietnamese Business Terms

> Map ngôn ngữ người dùng (tiếng Việt / tiếng Anh thông dụng) sang SQL column/value cụ thể.

### 5A — Phương tiện

| # | Từ người dùng hay dùng | Map sang SQL | Trạng thái |
|---|---|---|---|
| 5.1 | xe máy, xe 2 bánh, motorbike | `vehicle_type = 'MOTORBIKE'` | [ ] |
| 5.2 | ô tô, xe hơi, xe 4 bánh, car | `vehicle_type = 'CAR'` | [ ] |
| 5.3 | xe tải, truck | `vehicle_type = 'TRUCK'` | [ ] |
| 5.4 | xe điện, xe EV, electric vehicle | `vehicle_type = 'EV'` | [ ] |

### 5B — Tài chính

| # | Từ người dùng hay dùng | Map sang SQL | Trạng thái |
|---|---|---|---|
| 5.5 | doanh thu, thu nhập, thu phí, revenue | `SUM(amount_due)` WHERE `history_state='COMPLETED'` | [ ] |
| 5.6 | phí đỗ xe, parking fee | `SUM(parking_fee)` (trước khi giảm giá) | [ ] |
| 5.7 | giảm giá, khuyến mãi, discount | `SUM(promotion_amount + promotion_vinfast_amount)` | [ ] |
| 5.8 | tiền mặt | `payment_type = 'CASH'` | [ ] |
| 5.9 | thẻ ngân hàng, quẹt thẻ | `payment_type = 'CARD'` | [ ] |
| 5.10 | ví điện tử, e-wallet, MoMo/ZaloPay (generic) | `payment_type = 'E_WALLET'` | [ ] |
| 5.11 | vé tháng, thuê tháng, monthly pass | `payment_type = 'MONTHLY_PASS'` hoặc `service_name = 'Monthly Parking'` | [ ] |
| 5.12 | voucher, mã giảm giá | `use_voucher = TRUE` | [ ] |

### 5C — Vận hành bãi xe

| # | Từ người dùng hay dùng | Map sang SQL | Trạng thái |
|---|---|---|---|
| 5.13 | bãi xe, bãi đỗ, parking lot | `dim_parking_lot`, `pk_lot_id` | [ ] |
| 5.14 | khu vực, area, zone | `area_id` trong `dim_parking_lot` | [ ] |
| 5.15 | số xe đang đỗ, xe đang trong bãi | `current_occupancy` FROM `fct_parking_occupancy` | [ ] |
| 5.16 | giờ cao điểm, peak hour, rush hour | GROUP BY `hour` từ `dim_time`, ORDER BY `vehicles_in` DESC | [ ] |
| 5.17 | lưu lượng xe, traffic | `vehicles_in + vehicles_out` FROM `fct_parking_occupancy` | [ ] |
| 5.18 | thời gian đỗ, dwell time | `park_duration_ms / 60000` (đơn vị: phút) | [ ] |
| 5.19 | tỉ lệ lấp đầy, utilization rate | **BLOCKED** — thiếu `total_capacity` (xem Gap 7.1) | [ ] |
| 5.20 | khách vãng lai | `service_name = 'Visitor Parking'` hoặc `service_category = 'STANDARD'` | [ ] |
| 5.21 | nhân viên, staff | `service_category = 'STAFF'` | [ ] |
| 5.22 | VIP | `service_category = 'VIP'` | [ ] |
| 5.23 | cổng vào, entry gate | `entry_point_in_name` — giá trị: Gate In 1/2/3 | [ ] |
| 5.24 | làn xe, lane | `lane_in_name` (Lane IN 1–6), `lane_out_name` (Lane OUT 1–6) | [ ] |

### 5D — Thiết bị IoT

| # | Từ người dùng hay dùng | Map sang SQL | Trạng thái |
|---|---|---|---|
| 5.25 | thiết bị, device, IoT, sensor | `dim_device` | [ ] |
| 5.26 | camera | `device_type` LIKE `'%Camera%'` hoặc `'%camera%'` (nhiều biến thể — xem 1.14) | [ ] |
| 5.27 | đầu ghi, NVR | `device_type` LIKE `'%NVR%'` | [ ] |
| 5.28 | chiller, máy lạnh, HVAC | `device_type` LIKE `'%chiller%'` | [ ] |
| 5.29 | đồng hồ điện, energy meter | `device_type` LIKE `'%energy%'` | [ ] |
| 5.30 | đang online, hoạt động | `current_status = 'ONLINE'` | [ ] |
| 5.31 | offline, mất kết nối, ngắt kết nối | `current_status = 'OFFLINE'` | [ ] |
| 5.32 | đang bảo trì | `current_status = 'MAINTENANCE'` | [ ] |
| 5.33 | uptime, độ ổn định | `COUNT(*) FILTER (is_online=TRUE) / COUNT(*) * 100` | [ ] |

### 5E — Cấu trúc vật lý (Asset hierarchy)

| # | Từ người dùng hay dùng | Map sang SQL | Trạng thái |
|---|---|---|---|
| 5.34 | tòa nhà, building | `asset_type = 'building'` hoặc `asset_profile_name = 'Building'` | [ ] |
| 5.35 | tầng, floor | `asset_type = 'floor'` | [ ] |
| 5.36 | khu / vùng, zone | `asset_type = 'zone'` | [ ] |
| 5.37 | thiết bị cơ điện, equipment | `asset_type = 'equipment'` | [ ] |
| 5.38 | bãi đỗ xe (trong asset) | `asset_type = 'parking'` trong `dim_asset` (khác với `dim_parking_lot`) | [ ] |

---

## Nhóm 6 — Golden SQL Pairs

> Cần ít nhất 15 pairs verify xong trước khi go-live.
> Cách lưu: Wren UI → Ask tab → chạy câu hỏi → Save as thread → deploy để index vào Qdrant.

| # | Câu hỏi | SQL đã verify | Lưu vào Wren UI? | Trạng thái |
|---|---|---|---|---|
| 6.1 | Tổng số xe vào ra hôm nay | `SELECT COUNT(*) FROM sdp_golden.fct_vehicle_events WHERE event_date = CURDATE()` | [ ] | [ ] |
| 6.2 | Doanh thu tháng này | `SELECT SUM(amount_due) FROM sdp_golden.fct_vehicle_events WHERE history_state='COMPLETED' AND check_in_date_key BETWEEN ... AND ...` | [ ] | [ ] |
| 6.3 | Doanh thu theo loại xe | `SELECT vehicle_type, SUM(amount_due) FROM sdp_golden.fct_vehicle_events WHERE history_state='COMPLETED' GROUP BY vehicle_type ORDER BY 2 DESC` | [ ] | [ ] |
| 6.4 | Bãi xe nào đông nhất hiện tại | `SELECT parking_lot_id, MAX(current_occupancy) ... tại slot mới nhất` | [ ] | [ ] |
| 6.5 | Giờ cao điểm xe vào trong tuần qua | `SELECT dt.hour, SUM(po.vehicles_in) FROM sdp_golden.fct_parking_occupancy po JOIN sdp_golden.dim_time dt ... GROUP BY dt.hour ORDER BY 2 DESC` | [ ] | [ ] |
| 6.6 | Bao nhiêu camera đang offline | `SELECT COUNT(*) FROM sdp_golden.stg_dmp_device_status_events WHERE current_status='OFFLINE' AND device_type LIKE '%Camera%' AND ...` | [ ] | [ ] |
| 6.7 | Camera nào có CPU cao nhất | `SELECT dd.device_name, AVG(tc.cpu_usage_pct) FROM sdp_golden.stg_mv_dmp_tlm_camera tc JOIN sdp_golden.dim_device dd ON ... GROUP BY dd.device_name ORDER BY 2 DESC LIMIT 10` | [ ] | [ ] |
| 6.8 | Thời gian đỗ trung bình theo loại xe | `SELECT vehicle_type, AVG(park_duration_ms)/60000 AS avg_min FROM sdp_golden.fct_vehicle_events WHERE history_state='COMPLETED' GROUP BY vehicle_type` | [ ] | [ ] |
| 6.9 | Tỉ lệ VIP vs Standard vs Staff | `SELECT service_category, COUNT(*), SUM(amount_due) FROM sdp_golden.fct_vehicle_events WHERE history_state='COMPLETED' GROUP BY service_category` | [ ] | [ ] |
| 6.10 | Asset nào có nhiều device nhất | `SELECT da.asset_name, COUNT(DISTINCT da.device_id) FROM sdp_golden.dim_device_asset da GROUP BY da.asset_name ORDER BY 2 DESC LIMIT 10` | [ ] | [ ] |
| 6.11 | Device mất kết nối nhiều nhất tuần qua | `SELECT dd.device_name, COUNT(*) FROM sdp_golden.stg_dmp_device_status_events se JOIN sdp_golden.dim_device dd ... WHERE event_type='STATUS_CHANGE' AND current_status='OFFLINE' AND event_date >= ... GROUP BY dd.device_name ORDER BY 2 DESC LIMIT 10` | [ ] | [ ] |
| 6.12 | So sánh lưu lượng xe cuối tuần vs ngày thường | `SELECT dd.is_weekend, SUM(po.vehicles_in) FROM sdp_golden.fct_parking_occupancy po JOIN sdp_golden.dim_date dd ... GROUP BY dd.is_weekend` | [ ] | [ ] |
| 6.13 | Tỉ lệ giao dịch dùng voucher | `SELECT COUNT(*) FILTER (WHERE use_voucher=TRUE) * 100.0 / COUNT(*) FROM sdp_golden.fct_vehicle_events WHERE history_state='COMPLETED'` | [ ] | [ ] |
| 6.14 | Công suất điện tiêu thụ hiện tại theo thiết bị | `SELECT dd.device_name, AVG(em.power_active_kw) FROM sdp_golden.stg_mv_dmp_tlm_energy_meter em JOIN sdp_golden.dim_device dd ... GROUP BY dd.device_name` | [ ] | [ ] |
| 6.15 | Bãi xe nào thu doanh thu cao nhất tháng này | `SELECT pl.pk_lot_name, SUM(ve.amount_due) FROM sdp_golden.fct_vehicle_events ve JOIN sdp_golden.dim_parking_lot pl ... GROUP BY pl.pk_lot_name ORDER BY 2 DESC` | [ ] | [ ] |

---

## Nhóm 7 — Data Gaps (thiếu data, không thể trả lời dù SQL đúng)

| # | Câu hỏi không thể trả lời | Nguyên nhân | Giải pháp | Trạng thái |
|---|---|---|---|---|
| 7.1 | "Tỉ lệ lấp đầy bãi xe (utilization rate)?" | `dim_parking_lot` không có cột `total_capacity`. Max occupancy trong data là 5–7 xe/bãi/slot — không rõ đây là tổng sức chứa hay không | Thêm cột `total_capacity INT` vào `dim_parking_lot` và seed data. Sau đó thêm instruction: `utilization = current_occupancy / total_capacity * 100` | [ ] |
| 7.2 | "Tổng tiêu thụ điện theo tòa nhà / khu vực?" | `stg_mv_dmp_tlm_energy_meter` có `deviceId` nhưng thiếu join path tới `asset_type='building'`. Cần thêm `dim_device_asset` vào query chain | Document join path: `energy_meter → dim_device → dim_device_asset → dim_asset (asset_type='building')` trong instructions | [ ] |
| 7.3 | "Doanh thu theo khu vực bãi (area)?" | `fct_vehicle_events.parking_lot_id` join được với `dim_parking_lot.pk_lot_id` → có `area_id`. Join path đã có. **Không phải data gap** — chỉ cần thêm SQL pair | Thêm vào SQL pairs (Nhóm 6) | [ ] |

---

## Tiến độ tổng quan

Cập nhật bảng này mỗi khi deploy xong một nhóm.

| Nhóm | Tổng mục | Hoàn thành | % |
|---|---|---|---|
| 1A — Enum: vehicle events | 13 | 0 | 0% |
| 1B — Enum: device | 6 | 0 | 0% |
| 1C — Enum: asset | 2 | 0 | 0% |
| 1D — Enum: parking lot | 2 | 0 | 0% |
| 2A — KPI: revenue | 6 | 0 | 0% |
| 2B — KPI: traffic | 6 | 0 | 0% |
| 2C — KPI: device health | 4 | 0 | 0% |
| 2D — KPI: energy | 4 | 0 | 0% |
| 3 — Filter rules | 8 | 1 | 13% |
| 4 — Disambiguation | 8 | 0 | 0% |
| 5 — Vietnamese terms | 38 | 0 | 0% |
| 6 — SQL pairs | 15 | 0 | 0% |
| 7 — Data gaps | 3 | 0 | 0% |

---

## Thứ tự thực hiện đề xuất

```
Tuần 1: Nhóm 1 (enum values) + Nhóm 3 (filter rules) → thêm vào instructions.yml + descriptions.yml → deploy
Tuần 2: Nhóm 2 (KPI formulas) → thêm vào instructions.yml → deploy
Tuần 3: Nhóm 4 (disambiguation) + Nhóm 5 (Vietnamese terms) → deploy
Tuần 4: Nhóm 6 (SQL pairs) — viết và verify từng pair trên Wren UI → save → deploy
Ongoing: Nhóm 7 (data gaps) — cần xử lý ở tầng data pipeline
```
