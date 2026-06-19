# Batch 15 — AC.xlsx: Camera Quality, Uptime, Multi-turn & Edge Cases (Q141–Q149)

> **URL test:** http://74.48.140.178:27668/home  
> **Ngày test:** ___________  
> **Người test:** ___________  
> **Nguồn câu hỏi:** Task 3 AC4 — Smart City Chatbot Test Cases

---

**Lưu ý quan trọng về batch này:**
- Q145–Q147: Cần chạy tuần tự trong **cùng 1 phiên hội thoại** để test multi-turn context
- Q148: Test out-of-scope (AI không được sinh SQL)
- Q149: Test empty input (hệ thống không được crash)

---

| # | Câu hỏi | Loại case | Pass/Fail | Ghi chú |
|---|---------|-----------|-----------|---------|
| Q141 | Danh sách CO2_SENSOR có giá trị > 1000 ppm? | Threshold – Filter by threshold | | |
| Q142 | Camera nào có chất lượng hình ảnh kém (low light / noise)? | Threshold – Quality score | | |
| Q143 | Camera nào có RAM usage cao hơn 70%? | Threshold – Dynamic threshold | | |
| Q144 | Tỷ lệ uptime của toàn bộ camera Hikvision trong tháng? | Threshold – Uptime classification | | |
| Q145 | [Multi-turn] Còn tầng 5 thì sao? (sau câu Q124 về CO2 tầng 3) | Multi-turn – Context tầng | | |
| Q146 | [Multi-turn] Còn top nước thì sao? (sau câu Q130 về top điện) | Multi-turn – Domain chuyển | | |
| Q147 | [Multi-turn] Quay lại câu đầu về điện, kết quả còn giống không? | Multi-turn – Context overflow | | |
| Q148 | Tình hình thời tiết Hà Nội hôm nay? | Out-of-scope | | |
| Q149 | *(Gửi câu hỏi rỗng / chỉ khoảng trắng)* | Error handling | | |

---

## Chi tiết kết quả

### Q141 — [AC-22] CO2_SENSOR > 1000 ppm
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** Filter theo ngưỡng tuyệt đối; phạm vi mơ hồ → toàn hệ thống
- **Lưu ý:** Không có bảng ppm — AI cần list device + báo không thể xác định giá trị?
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q142 — [AC-23] Camera chất lượng hình ảnh kém
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** CPU>70% hoặc memory thấp là proxy; không có trường SNR trực tiếp
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q143 — [AC-24] Camera RAM usage > 70%
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** `memory_used_mb / (memory_used_mb + memory_free_mb) > 70%`
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q144 — [AC-25] Uptime Hikvision camera tháng này
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** "Tháng" mơ hồ → 30 ngày rolling; phân loại Tốt/Theo dõi/Thấp
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q145 — [AC-26] Multi-turn: Còn tầng 5 thì sao?
- **Phiên hội thoại:** Phải hỏi **ngay sau Q124** (CO2 tầng 3 tòa nhà A) trong cùng 1 phiên
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** AI phải tự inject "tòa nhà A" từ context; chỉ đổi floor 3 → floor 5
- **AI có kế thừa context?** Có / Không
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q146 — [AC-27] Multi-turn: Còn top nước thì sao?
- **Phiên hội thoại:** Phải hỏi **ngay sau Q130** (top điện) trong cùng 1 phiên
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:** AI giữ N=5 và 30 ngày từ context; chỉ đổi electricity → water
- **AI có kế thừa N và period?** Có / Không
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q147 — [AC-28] Multi-turn Context Overflow: Câu đầu về điện
- **Phiên hội thoại:** Hỏi **sau ≥5 lượt** kể từ Q120 (tiêu thụ điện khu vực A)
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kiểm tra:**
  - Nếu AI nhớ: trả lại kết quả câu Q120
  - Nếu AI quên: thông báo rõ hoặc fallback về 30d rolling
  - AI không được crash hoặc hallucinate
- **AI xử lý context overflow thế nào?** Nhớ / Quên / Báo lỗi / Fallback
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q148 — [AC-29] Out-of-scope: Thời tiết Hà Nội
- **Câu hỏi gửi đi:** `Tình hình thời tiết Hà Nội hôm nay như thế nào?`
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kết quả mong đợi:** Không sinh SQL; thông báo từ chối khéo về phạm vi hệ thống
- **AI có sinh SQL sai domain?** Có / Không
- **Đúng / Sai:**
- **Ghi chú:**

---

### Q149 — [AC-30] Error Handling: Input rỗng
- **Câu hỏi gửi đi:** *(chỉ gửi khoảng trắng hoặc chuỗi rỗng)*
- **Kết quả nhận được:**
- **SQL Wren AI sinh ra:**
- **Kết quả mong đợi:** Không gọi LLM; thông báo validation error hoặc prompt người dùng
- **Hệ thống có crash?** Có / Không
- **Đúng / Sai:**
- **Ghi chú:**

---

## Tổng kết Batch 15

| Tổng câu | Pass | Fail | Tỷ lệ Pass |
|----------|------|------|------------|
| 9 | | | |

---

> **Lưu ý quan trọng:** Q148 và Q149 không có "đúng SQL" vì không sinh SQL. PASS khi AI  
> từ chối/báo lỗi đúng cách; FAIL khi AI sinh SQL sai domain hoặc crash.
