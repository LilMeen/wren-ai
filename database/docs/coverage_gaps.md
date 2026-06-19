# Lỗ hổng coverage trong instructions.yml & sql_pairs/*.yml (rà soát hiện tại)

Tài liệu này tổng hợp các lỗ hổng về **cột/bảng** và **cú pháp SQL (MySQL/StarRocks/DataFusion)**
phát hiện được khi đối chiếu `instructions.yml`, `sql_pairs/*.yml` với schema thật
(`starrock_schema.json`) và kết quả chạy bộ 48 test (`question_test.md`).

Trạng thái: ❌ = gây fail test thực tế · ⚠️ = rủi ro/chưa có ví dụ minh chứng · ✅ = đã có guard nhưng có thể siết thêm

---

## 1. Lỗ hổng về BẢNG / CỘT (table & column coverage)

### 1.1 ❌ `dim_device_asset` bị nhầm có cột SCD (`dbt_valid_to`, `dbt_valid_from`, `dbt_scd_id`)
- **Thực tế**: chỉ `dim_device_asset_snapshot` có các cột SCD-2 này. `dim_device_asset` là bảng
  current-state đã denormalize, KHÔNG có các cột đó.
- **Lỗi quan sát**: T-CRS-02 → `No field named da.dbt_valid_to.`
- **Hiện trạng tài liệu**: `device_status_filter` (instructions.yml) mô tả join chain
  `stg_dmp_device_status_events → dim_device → dim_device_asset` nhưng KHÔNG cảnh báo rõ
  việc thêm filter `dbt_valid_to` lên `dim_device_asset` là sai bảng.
- **Đề xuất**: bổ sung 1 câu cảnh báo tường minh trong `device_status_filter` (hoặc instruction
  riêng `device_asset_no_scd_columns`): *"dim_device_asset KHÔNG có dbt_valid_to/dbt_valid_from/
  dbt_scd_id. Các cột SCD-2 này CHỈ tồn tại trên dim_device_asset_snapshot. Không bao giờ filter
  dbt_valid_to trên dim_device_asset."*

### 1.2 ❌ Thiếu sql_pair lọc điện năng theo TÊN TÒA NHÀ cụ thể (building name)
- **Thực tế**: các sql_pair điện năng hiện có (SP-TLM-27/30/33/34) chỉ lọc theo `asset_name LIKE
  '%C%'` (area letter), KHÔNG có ví dụ lọc theo building name dạng `BUILDING_001`.
- **Lỗi quan sát**: T-TLM-04 ("Tiêu thụ điện tháng này tại tòa nhà BUILDING_001?") → AI tự bịa
  CTE alias sai (`sub.electricity_consumption` – cột này không tồn tại ở đâu cả, là cột
  hallucinate).
- **Đề xuất**: thêm sql_pair mới trong `sql_pairs_telemetry.yml`, mẫu join:
  ```sql
  SELECT da.asset_name,
         MAX(e.energy_active_kwh_total) - MIN(e.energy_active_kwh_total) AS kwh_consumed
  FROM sdp_near_realtime_stg_mv_dmp_tlm_energy_meter e
  JOIN sdp_golden_dim_device d ON e.deviceId = d.device_id
  JOIN sdp_golden_dim_device_asset da ON d.device_id = da.device_id
  WHERE da.asset_name = 'BUILDING_001'
    AND e.tsDt >= DATE_FORMAT(NOW(), '%Y-%m-01')
  GROUP BY da.asset_name
  ```
  Tham khảo mẫu join đã có ở `energy_by_area_join` (instructions.yml) nhưng viết rõ biến thể
  cho building-name thay vì chỉ area-letter.

### 1.3 ⚠️ `camera_quality_thresholds` (cpu_usage_pct > 70 proxy) chưa có sql_pair minh chứng
- **Lỗi quan sát**: T-THR-03 → "No SQL generated".
- **Hiện trạng**: instruction `camera_quality_thresholds` có `isDefault: false` nên có thể không
  được retrieve nếu câu hỏi không khớp đúng các `questions` mẫu, và không có sql_pair nào dùng
  proxy `cpu_usage_pct > 70` thật.
- **Đề xuất**: thêm sql_pair trong `sql_pairs_telemetry.yml` (domain camera):
  ```sql
  SELECT d.device_name, c.cpu_usage_pct, c.tsDt
  FROM sdp_near_realtime_stg_mv_dmp_tlm_camera c
  JOIN sdp_golden_dim_device d ON c.deviceId = d.device_id
  WHERE c.cpu_usage_pct > 70
  ORDER BY c.cpu_usage_pct DESC
  ```
  và cân nhắc set `isDefault: true` cho instruction này nếu câu hỏi "chất lượng hình ảnh kém"
  vẫn không trigger được instruction qua retrieval.

### 1.4 ⚠️ `chiller_telemetry_columns` mâu thuẫn với kỳ vọng test (No SQL vs SQL proxy)
- **Thực tế schema**: `stg_mv_dmp_tlm_chiller` KHÔNG có cột nhiệt độ nào (chỉ có `chiller_state,
  fault, mode, *_valve_*_limit`).
- **Vấn đề**: instruction hiện tại hướng dẫn AI "không có dữ liệu nhiệt độ — nên nói rõ điều đó"
  (trả lời bằng text, không SQL). Nhưng `question_test.md` kỳ vọng một SQL proxy dùng
  `AVG(chiller_state)` cho câu hỏi "nhiệt độ làm lạnh trung bình".
  → T-TLM-06 vẫn trả "No SQL generated" vì AI làm đúng theo instruction (từ chối) thay vì sinh
  SQL proxy.
- **Đề xuất**: sửa lại instruction để hướng dẫn AI sinh SQL proxy thay vì từ chối, và bổ sung
  sql_pair:
  ```sql
  SELECT c.deviceId,
         ROUND(AVG(c.chiller_state), 2) AS avg_chiller_state
  FROM sdp_near_realtime_stg_mv_dmp_tlm_chiller c
  WHERE c.tsDt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  GROUP BY c.deviceId
  ```
  (giữ lại đoạn note "không có cột nhiệt độ thật, dùng chiller_state làm proxy" để AI không tự
  bịa cột `temperature`.)

### 1.5 ⚠️ Không có sql_pair "doanh thu tháng trước" (revenue last month)
- Tất cả sql_pair doanh thu theo tháng (SP-PRK-02, 16, 17, 18, 19, 21...) đều dùng
  `d.year = YEAR(NOW()) AND d.month = MONTH(NOW())` (tháng NÀY), không có ví dụ cho "tháng
  TRƯỚC".
- **Lỗi quan sát**: test "doanh thu tháng trước" → AI tự dùng `LAST_DAY()` (hàm không tồn tại
  trong DataFusion/StarRocks SQL planner ở đây — lỗi `Invalid function 'last_day'`).
- **Đề xuất**: thêm sql_pair dùng join `dim_date` với offset tháng, KHÔNG dùng `LAST_DAY()`:
  ```sql
  SELECT SUM(e.amount_due) AS revenue_vnd
  FROM sdp_golden_fct_vehicle_events e
  JOIN sdp_golden_dim_date d ON e.check_out_date_key = d.date_key
  WHERE e.history_state = 'COMPLETED'
    AND d.year_month = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m')
  ```

---

## 2. Lỗ hổng về CÚ PHÁP SQL (MySQL/StarRocks/DataFusion compatibility)

`cast_type_rules` (instructions.yml) đã ghi nhận một số hạn chế (không dùng `CAST(...AS
SIGNED/UNSIGNED)`, không dùng `DATE()`, không dùng window function trong vài context, không dùng
scalar subquery trong SELECT list, không dùng `YEARWEEK(col, mode)` 2 tham số) nhưng còn thiếu:

### 2.1 ❌ `LAST_DAY()` không được hỗ trợ
- Lỗi thực tế: `Invalid function 'last_day'. Did you mean 'list_cat'?`
- **Đề xuất**: thêm dòng cảnh báo rõ trong `cast_type_rules`: *"KHÔNG dùng LAST_DAY(). Để tính
  'tháng trước' hoặc khoảng ngày cuối tháng, dùng DATE_SUB/DATE_FORMAT kết hợp join dim_date
  (year_month) thay vì gọi hàm ngày-cuối-tháng trực tiếp."*

### 2.2 ❌ Window function (OVER/DENSE_RANK/ROW_NUMBER/LAG/LEAD) không được dùng trong HAVING
- Lỗi thực tế: `HAVING clause cannot contain window function.`
- Quan sát: window function vẫn hoạt động bình thường trong SELECT list ở nhiều test pass
  (T-PRK-03, T-PRK-12, T-DEV-08) — vấn đề CHỈ xảy ra khi window function bị đặt trong HAVING.
- **Đề xuất**: thêm dòng trong `cast_type_rules`: *"Window function (OVER(), DENSE_RANK(),
  ROW_NUMBER(), LAG(), LEAD()...) chỉ được dùng trong SELECT list, KHÔNG được dùng trong HAVING.
  Để lấy 'top N theo nhóm' hoặc lọc theo rank, dùng subquery/CROSS JOIN để tính tổng trước rồi
  ORDER BY + LIMIT ở ngoài (xem mẫu SP-PRK-14), không filter rank bằng HAVING."*
- Sql_pair tham chiếu cho mẫu đúng: **SP-PRK-14** (`sql_pairs_parking.yml`) — dùng CROSS JOIN
  subquery để tính `revenue_pct` mà không cần window function/HAVING.
- **Đề xuất bổ sung**: thêm 1 sql_pair "Top bãi xe có doanh thu cao nhất tháng này?" dựa hẳn theo
  pattern SP-PRK-14 nhưng thêm `ORDER BY revenue_vnd DESC LIMIT 5` (không dùng window+HAVING).

### 2.3 ✅ (đã đúng, không cần sửa) Các pattern dùng `CROSS JOIN (subquery)` để tính %/tổng
  thay vì window function — đã có nhiều ví dụ tốt (SP-PRK-05, 11, 13, 14, 21; SP-DEV-06) nên AI
  có đủ "vốn từ" để mô phỏng, miễn là câu hỏi match đúng pattern retrieval.

---

## 3. Tổng hợp việc cần làm tiếp (chưa thực hiện — đang chờ xác nhận)

| # | Hạng mục | File cần sửa | Loại sửa |
|---|----------|--------------|----------|
| 1 | Cảnh báo `dim_device_asset` không có cột SCD | `instructions.yml` (`device_status_filter`) | sửa instruction |
| 2 | Sql_pair điện năng theo building name | `sql_pairs_telemetry.yml` | thêm sql_pair |
| 3 | Sql_pair camera cpu_usage_pct>70 proxy | `sql_pairs_telemetry.yml` | thêm sql_pair |
| 4 | Sửa `chiller_telemetry_columns` để sinh SQL proxy thay vì từ chối + sql_pair chiller_state | `instructions.yml`, `sql_pairs_telemetry.yml` | sửa instruction + thêm sql_pair |
| 5 | Sql_pair "doanh thu tháng trước" (không dùng LAST_DAY) | `sql_pairs_parking.yml` | thêm sql_pair |
| 6 | Cảnh báo cấm `LAST_DAY()` | `instructions.yml` (`cast_type_rules`) | sửa instruction |
| 7 | Cảnh báo cấm window function trong HAVING + sql_pair "top bãi xe doanh thu cao nhất" theo mẫu SP-PRK-14 | `instructions.yml` (`cast_type_rules`), `sql_pairs_parking.yml` | sửa instruction + thêm sql_pair |

Sau khi áp dụng các sửa trên, cần push qua `add_instruction.py --replace` /
`add_sql_pair.py --replace --domain <domain>` rồi chạy lại
`python database/scripts/run_question_tests.py --all` để xác nhận (lưu ý: hệ thống có flakiness
run-to-run nên cần chạy lại 2-3 lần để confirm fix thực sự có tác dụng, không phải nhiễu).
