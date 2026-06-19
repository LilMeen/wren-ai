# Batch 14 — AC.xlsx: Status & Threshold Queries (Q131–Q140)

> **URL test:** http://74.48.140.178:27668/home  
> **Ngày test:** ___________  
> **Người test:** ___________  
> **Nguồn câu hỏi:** Task 3 AC4 — Smart City Chatbot Test Cases

---

**Default rules áp dụng:**
- Ngưỡng RAM cao = >70%; CO2 an toàn = <1000 ppm; Uptime ≥95%=Tốt/80–95%=Theo dõi/<80%=Thấp
- Thiết bị hỏng = offline + không tín hiệu >3 ngày
- Top N mặc định = 5

---

| # | Câu hỏi | Loại case | Pass/Fail | Ghi chú |
|---|---------|-----------|-----------|---------|
| Q131 | Top 3 khu vực tiêu thụ nước ít nhất trong tháng? | Top – N rõ, direction rõ | | |
| Q132 | Top 5 khu vực FCU_FAN_COIL chạy nhiều nhất tháng này? | Top – Metric giờ vận hành | | |
| Q133 | Thiết bị nào có số lần lỗi cao nhất trong 14 ngày qua? | Top – All device, lỗi nhiều | | |
| Q134 | Khu vực nào có nồng độ CO2 cao nhất hiện tại? | Top – Real-time, default N | | |
| Q135 | Danh sách camera đang bị hỏng hoặc offline? | Status – Multi-status filter | | |
| Q136 | Danh sách thang máy đang bảo trì hoặc hỏng? | Status – Maintenance vs Error | | |
| Q137 | Danh sách ACB_BREAKER đang bị trip hoặc lỗi? | Status – Electrical fault | | |
| Q138 | Tất cả thiết bị đang ở trạng thái Error hoặc Maintenance? | Status – Union all types | | |
| Q139 | Face Terminal nào đang ở chế độ bảo trì? | Status – Specific device type | | |
| Q140 | CO2_SENSOR tại khu vực A có vượt ngưỡng an toàn không? | Threshold – 1000 ppm | | |

---

## Chi tiết kết quả

### Q131 — [AC-12] Top 3 khu vực nước ít nhất tháng
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** N=3 (user nói rõ), ASC (ít nhất), 30d rolling (tháng mơ hồ)
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q132 — [AC-13] Top 5 khu vực FCU chạy nhiều nhất
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** FCU device type, metric = giờ vận hành / số lần online, từ đầu tháng
- **Lưu ý:** Không có bảng telemetry FCU runtime — AI dùng bảng nào?
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q133 — [AC-14] Thiết bị lỗi nhiều nhất 14 ngày
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** Tất cả device types; count offline/error events; Top 5
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q134 — [AC-15] Khu vực CO2 cao nhất hiện tại
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** Real-time snapshot; Top N=5; sort DESC
- **Lưu ý:** Không có bảng ppm CO2 — AI phải xử lý graceful
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q135 — [AC-16] Camera hỏng / offline
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** Status IN (Offline, Error) OR không tín hiệu >3 ngày
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q136 — [AC-17] Thang máy bảo trì / hỏng
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** Phân biệt scheduled maintenance vs sự cố đột xuất
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q137 — [AC-18] ACB_BREAKER trip / lỗi
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** device_type LIKE '%ACB%'; status IN (Trip, Error, Offline)
- **Lưu ý:** ACB có thể không có trong dim_device — ghi lại
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q138 — [AC-19] Tất cả thiết bị Error / Maintenance
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** Union tất cả device types, không lọc theo loại
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q139 — [AC-20] Face Terminal đang bảo trì
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** Chỉ lấy MAINTENANCE (không phải OFFLINE hay ERROR)
- **Lưu ý:** Face Terminal có thể không có trong dim_device — ghi lại
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q140 — [AC-21] CO2 khu vực A có vượt 1000 ppm không?
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** Trả cả giá trị và verdict (An toàn / Vượt ngưỡng)
- **Lưu ý:** Không có bảng ppm — AI cần thông báo không?
- **Đúng / Sai:**
- **Ghi chú:**

---

## Tổng kết Batch 14

| Tổng câu | Pass | Fail | Tỷ lệ Pass |
|----------|------|------|------------|
| 10 | | | |
