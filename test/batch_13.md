# Batch 13 — AC.xlsx: Metric & Trend Queries (Q121–Q130)

> **URL test:** http://74.48.140.178:27668/home  
> **Ngày test:** ___________  
> **Người test:** ___________  
> **Nguồn câu hỏi:** Task 3 AC4 — Smart City Chatbot Test Cases

---

**Default rules áp dụng (từ AC.xlsx):**
- Thời gian mơ hồ → 30 ngày rolling
- Trend > 90 ngày → grain tháng; Trend ≤ 7 ngày → grain ngày
- Top N mặc định = 5
- Bất thường = mean ±30% so với 30 ngày trước

---

| # | Câu hỏi | Loại case | Pass/Fail | Ghi chú |
|---|---------|-----------|-----------|---------|
| Q121 | Tòa nhà BUILDING_001 có bao nhiêu FCU_FAN_COIL đang hoạt động? | Metric – FCU device count | | |
| Q122 | Mực nước bồn WATER_TANK_LEVEL hiện tại của hệ thống? | Metric – Real-time snapshot | | |
| Q123 | Tổng tiêu thụ điện của CHILLER trong 7 ngày qua? | Metric – Thời gian rõ | | |
| Q124 | Nồng độ CO2 hiện tại tại tầng 3 tòa nhà A? | Metric – Real-time CO2 | | |
| Q125 | Xu hướng tiêu thụ điện khu vực B trong tuần qua? | Trend – 7 ngày, grain ngày | | |
| Q126 | Xu hướng tiêu thụ nước của khu vực trong 3 tháng qua? | Trend – 3 tháng, grain tháng | | |
| Q127 | Số liệu và xu hướng điện tháng trước – khu vực C? | Trend – Metric + series | | |
| Q128 | WATER_TANK_LEVEL có giảm bất thường trong 3 ngày qua không? | Trend – Anomaly detection | | |
| Q129 | Nhiệt độ làm lạnh CHILLER so với tuần trước như thế nào? | Trend – 2 kỳ so sánh | | |
| Q130 | Top khu vực tiêu thụ điện nhiều nhất? | Top – Thiếu N/time/direction | | |

---

## Chi tiết kết quả

### Q121 — [AC-2] FCU_FAN_COIL đang hoạt động tại BUILDING_001
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Default áp dụng:** Scope = tòa nhà user hỏi; thời gian = CURRENT_TIMESTAMP
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q122 — [AC-3] WATER_TANK_LEVEL hiện tại
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Default áp dụng:** Query CURRENT_TIMESTAMP; scope gần nhất user
- **Lưu ý:** Không có telemetry WATER_TANK trong DB — AI có graceful handle không?
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q123 — [AC-4] Tiêu thụ điện CHILLER 7 ngày
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Default áp dụng:** "7 ngày qua" = user nói rõ → historical; không grain → tổng
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q124 — [AC-5] CO2 tầng 3 tòa nhà A
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Default áp dụng:** Real-time; ngưỡng 1000 ppm
- **Lưu ý:** Không có telemetry CO2 ppm — AI cần thông báo giới hạn không?
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q125 — [AC-6] Xu hướng điện khu vực B tuần qua
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Default áp dụng:** "Tuần qua" = 7 ngày; trend → grain ngày
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q126 — [AC-7] Xu hướng nước 3 tháng
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Default áp dụng:** >90 ngày → grain tháng; khu vực mơ hồ → toàn hệ thống
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q127 — [AC-8] Số liệu + xu hướng điện tháng trước khu vực C
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** AI phải trả cả tổng (scalar) lẫn series (chart) hoặc clarify
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q128 — [AC-9] WATER_TANK_LEVEL bất thường 3 ngày
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Default áp dụng:** Anomaly = mean ±30% so với 30 ngày trước
- **Lưu ý:** Không có telemetry level — AI phải xử lý graceful
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q129 — [AC-10] Chiller so sánh tuần này vs tuần trước
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** AI phải trả 2-period comparison, grain ngày
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q130 — [AC-11] Top khu vực tiêu thụ điện (không rõ N/time/direction)
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Default áp dụng:** N=5 (default); 30d rolling; DESC (nhiều nhất)
- **Kiểm tra:** AI áp đúng 3 default không?
- **Đúng / Sai:**
- **Ghi chú:**

---

## Tổng kết Batch 13

| Tổng câu | Pass | Fail | Tỷ lệ Pass |
|----------|------|------|------------|
| 10 | | | |
