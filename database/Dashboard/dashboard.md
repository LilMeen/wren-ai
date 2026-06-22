# ESG Smart City Dashboard — Mô tả theo từng ảnh

> **URL:** http://74.48.140.178:27668/home  
> **Chụp ngày:** 2026-06-19

---

## Tổng quan — Widget có trong từng ảnh

> Mỗi image tích lũy thêm widget từ image trước — image 5 hiển thị **tất cả** widget.

| Ảnh | Tên | Widget MỚI | Tổng widget |
|-----|-----|-----------|-------------|
| 1 | Raw Data Table | Bảng thiết bị · NVR memory chart · CPU chart · Events chart | 4 |
| 2 | Parking Energy | **K1 K2 K3 K5** · **E2 E1 E3 E4 E5** | 9 |
| 3 | Social | **S1 S2 S3 S4 S5** | 14 |
| 4 | Governance | **G1 G2 G3 G4 G5** | 19 |
| 5 | Parking Lot Occupancy | **O1 O2 O3 O4** | 23 |

---
---

## Image 1 — Raw Data Table

**File:** `demo-sdp-esg-dashboard-2026-06-19T02-58-34.835Z.jpg`

---

### Bảng dữ liệu thiết bị

Bảng dạng spreadsheet với hàng nghìn dòng, mỗi dòng là 1 trạng thái của 1 thiết bị thông minh.

| Cột | Mô tả |
|-----|-------|
| Timestamp | Thời gian xảy ra sự kiện |
| Device ID | Mã định danh thiết bị |
| Device Code | Tên thiết bị + địa chỉ (nếu có) |
| Status | Trạng thái hiện tại của thiết bị |

---

### Chart — NVR Memory Usage

- **Loại:** Area / line chart
- **Trục X:** Timeline · **Trục Y:** Memory usage
- **2 series:** Average Free Memory · Average Used Memory

---

### Chart — Average CPU Camera Usage

- **Loại:** Line chart
- **Nội dung:** Timeline vs CPU usage (%) của camera

---

### Chart — Số lượng sự kiện trong ngày

- **Loại:** Bar chart theo ngày
- **Nội dung:** Tổng số sự kiện IoT xảy ra mỗi ngày

---
---

## Image 2 — Parking Energy

**File:** `esg-smart-city-dashboard-parking-energy-2026-06-19T02-59-53.364Z.jpg`  
**Widget MỚI:** K1 · K2 · K3 · K5 · E2 · E1 · E3 · E4 · E5

```
[ K1 ]  [ K2 ]  [ K3 ]  [ K5 ]          ← 4 KPI cards (hiện ở mọi image từ đây)
[ E2 — Hourly Power Demand Profile   ]   ← full width
[ E1 — Daily Energy & Water ]  [ E3 — Power Factor Table ]
[ E4 — Vehicle Type Pie     ]  [ E5 — Avg Parking Duration ]
```

---

### K1 — EV Penetration Rate

| | |
|-|-|
| **Giá trị** | 19.3 % |
| **Nhãn phụ** | EV share of known vehicle types (%) |
| **Ý nghĩa** | Tỷ lệ xe điện (eCar + eBicycle + eMotorbike) trong tổng giao dịch có xác định loại xe |
| **Nguồn** | `fct_vehicle_events` · filter `history_state = 'COMPLETED'` |

---

### K2 — Digital Payment Adoption

| | |
|-|-|
| **Giá trị** | 99.1 % |
| **Nhãn phụ** | Digital payments: subscriber / wallet / bank (%) |
| **Ý nghĩa** | Tỷ lệ giao dịch thanh toán số, không bao gồm CASH |
| **Nguồn** | `fct_vehicle_events.payment_type` |

---

### K3 — Total Energy Consumed

| | |
|-|-|
| **Giá trị** | 744,300 kWh |
| **Nhãn phụ** | Across 36 smart meters (3-day total) |
| **Ý nghĩa** | Tổng điện tiêu thụ qua 36 smart meter trong 3 ngày gần nhất |
| **Nguồn** | `stg_mv_dmp_tlm_energy_meter` — `MAX−MIN(energy_active_kwh_total)` per device × 3 ngày, rồi SUM |

---

### K5 — Current Active Parked Vehicles

| | |
|-|-|
| **Giá trị** | 1.31 k |
| **Nhãn phụ** | Vehicles checked in but not yet checked out |
| **Ý nghĩa** | Tổng số xe đang đỗ trên toàn hệ thống tại thời điểm xem |
| **Nguồn** | `fct_parking_occupancy` — `SUM(current_occupancy)` tại `MAX(occupancy_hour)` |

---

### E2 — Hourly Power Demand Profile *(full width)*

- **Loại:** Area chart — 3 dải chồng lên nhau
- **Trục X:** Timeline liên tục — 2026-05-28 00:00 → 2026-06-02 04:00 (~5 ngày, granularity theo giờ)
- **Trục Y:** kW · thang 0–200

| Series | Vị trí | Giá trị điển hình |
|--------|--------|------------------|
| Peak kW | Dải trên cùng | ~150–160 kW |
| Avg kW | Dải giữa | ~100–130 kW |
| Min kW | Dải dưới | ~80–100 kW |

- **Nguồn:** `stg_mv_dmp_tlm_energy_meter.power_active_kw` GROUP BY timestamp

---

### E1 — Daily Energy & Water Consumption *(bên trái)*

- **Loại:** Dual-axis line chart
- **Trục X:** Ngày — 2026-05-27 → 2026-06-05 (~9 ngày)
- **Trục Y:** kWh (0–150k)

| Series | Đỉnh quan sát | Ghi chú |
|--------|--------------|---------|
| Energy kWh | ~130k kWh (~2026-05-31) | `MAX−MIN(energy_active_kwh_total)` per device per day → SUM |
| Water m³ | Thấp hơn, cùng trend | `MAX−MIN(water_volume_m3_total)` per device per day → SUM |

---

### E3 — Power Factor & Consumption by Device *(bên phải, cạnh E1)*

- **Loại:** Data table — ~36 hàng (1 hàng = 1 smart meter)

| Cột | Giá trị mẫu | Ý nghĩa |
|-----|------------|---------|
| Device ID | `9a40bea7-8c1a-469c-940b-…` | UUID smart meter |
| Avg PF | 0.916 | Power factor trung bình |
| Min PF | 0.85 | Power factor thấp nhất |
| Total kWh | 20,675.0 | Điện tiêu thụ 3 ngày |
| Total Water m³ | 1,654.0 | Nước tiêu thụ 3 ngày |

- **Nguồn:** `stg_mv_dmp_tlm_energy_meter` GROUP BY `deviceId` · window 3 ngày

---

### E4 — Vehicle Type Distribution *(pie chart, bên trái)*

- **Loại:** Pie chart

| Loại xe | Số lượng | Tỷ lệ |
|---------|---------|-------|
| motorbike | ~4,750 | **68.82%** |
| eMotorbike | ~1,140 | **16.47%** |
| car | ~580 | **8.40%** |
| bicycle | nhỏ | ~2% |
| eCar | nhỏ | ~2% |
| eBicycle | nhỏ | ~1% |
| `<NULL>` | nhỏ | ~1% |

- **Nguồn:** `fct_vehicle_events.vehicle_type` — COUNT(*) GROUP BY vehicle_type

---

### E5 — Avg Parking Duration by Vehicle Type *(horizontal bar, bên phải)*

- **Loại:** Horizontal bar chart
- **Trục Y:** Loại xe (`<NULL>`, motorbike, eMotorbike, eCar, eBicycle, car, bicycle)
- **Trục X:** Giờ đỗ trung bình (~20–85h trong data test)
- **Sắp xếp:** Giảm dần
- **Nguồn:** `AVG(park_duration_ms) / 3,600,000` per vehicle_type từ `fct_vehicle_events`

---
---

## Image 3 — Social

**File:** `esg-smart-city-dashboard-parking-energy-2026-06-19T03-00-22.876Z.jpg`  
**Widget MỚI:** S1 · S2 · S3 · S4 · S5  
**Tái hiển thị từ Image 2:** K1 K2 K3 K5 · E2 E1 E3 E4 E5 *(không thay đổi)*

```
— [Toàn bộ widget Image 2] —
[ S1 — Digital Payment donut ]  [ S2 — Revenue by Vehicle bar ]
[ S4 — Hourly Parking Demand           (full width)            ]
[ S3 — EV Penetration by Location ]  [ S5 — Revenue by Payment ]
```

---

### S1 — Digital Payment Adoption Rate *(donut chart, bên trái)*

- **Loại:** Donut chart

| Phương thức | Số giao dịch | Tỷ lệ |
|------------|-------------|-------|
| subscriber (MONTHLY_PASS) | ~3,600 | **53.40%** |
| `<NULL>` | ~1,070 | ~15% |
| wallet (E_WALLET) | ~821 | ~12% |
| bank (CARD) | ~817 | **11.81%** |

- **Nguồn:** `fct_vehicle_events.payment_type` — COUNT(*) GROUP BY payment_type

---

### S2 — Total Revenue by Vehicle Type *(bar chart, bên phải)*

- **Loại:** Vertical bar chart
- **Trục X:** Loại xe (eBicycle, motorbike, eMotorbike, car, eCar, bicycle, truck, `<NULL>`)
- **Trục Y:** Doanh thu VND
- **Nguồn:** `SUM(amount_due)` GROUP BY `vehicle_type`

---

### S4 — Hourly Parking Demand *(grouped bar chart, full width)*

- **Loại:** Grouped bar chart theo giờ trong ngày
- **Trục X:** Giờ 0–23 · **Trục Y:** Số lượt xe vào (`vehicles_in`), thang 0–400+
- **Mỗi giờ:** Nhiều thanh màu — mỗi thanh = tổng số phương tiện ở các khu vực khác nhau có nhu cầu đỗ xe tại giờ đó
- **Legend:** OCP1 · LAB1 (khu vực bãi đỗ)
- **Nguồn:** `fct_parking_occupancy.vehicles_in` GROUP BY `HOUR(occupancy_hour)`, `vehicle_type`

---

### S3 — EV Penetration by Location *(horizontal bar, bên trái)*

- **Mục tiêu:** Tỷ lệ phương tiện điện ở mỗi khu vực
- **Loại:** Horizontal stacked bar — mỗi thanh split EV vs ICE
- **Trục Y:** Tên bãi / khu vực (`<NULL>`, `EV1_Parking`, `EV1_Parking_1`, `EV1_Parking_2`, …)
- **Legend:** `EV` (xanh lá) · `ICE` (xanh nhạt)
- **Nguồn:** `fct_vehicle_events` JOIN `dim_parking_lot` · classify EV = eCar + eBicycle + eMotorbike

---

### S5 — Revenue by Payment Channel *(donut chart, bên phải)*

- **Mục đích:** Xác định tỷ lệ kênh thanh toán ở bãi đỗ xe
- **Loại:** Donut chart — tính theo DOANH THU (khác S1 tính theo số giao dịch)

| Kênh | Doanh thu | Tỷ lệ |
|------|----------|-------|
| subscriber | ~35.2M VND | ~51% |
| wallet | ~1.8M VND | ~28% |
| bank | ~14.3k VND | ~21% |

- **Nguồn:** `SUM(amount_due)` GROUP BY `payment_type`

---
---

## Image 4 — Governance

**File:** `esg-smart-city-dashboard-parking-energy-2026-06-19T03-00-34.890Z.jpg`  
**Widget MỚI:** G1 · G2 · G3 · G4 · G5  
**Tái hiển thị từ Image 3:** K1–K5 · E2 E1 E3 E4 E5 · S1 S2 S3 S4 S5 *(không thay đổi)*

```
— [Toàn bộ widget Image 3] —
[ G1 — ??? (cần xác nhận)      ]  [ ??? ]
[ G2 — Lot Utilization bar     ]  [ G3 — Smart Meter table              ]
[ G4 — Payment Diversity donut ]  [ G5 — IoT Freshness table (rất dài)  ]
```

---

### G1 — *(cần xác nhận từ ảnh)*

> ⚠️ G1 là widget đầu tiên trong Governance tab — chưa xác định được tên và nội dung. Bổ sung sau.

---

### G2 — Parking Lot Utilization by Org *(horizontal bar, bên trái)*

- **Loại:** Horizontal bar chart — grouped by khu vực / org
- **Trục Y:** Tên bãi đỗ, phân theo AREA_01, AREA_02, …
- **Trục X:** Số xe hiện đang đỗ (`current_occupancy`)
- **Ý nghĩa:** So sánh mức độ sử dụng giữa các bãi/khu vực trong tổ chức
- **Nguồn:** `fct_parking_occupancy` JOIN `dim_parking_lot` GROUP BY `area_id` · tại `MAX(occupancy_hour)`

---

### G3 — Smart Meter Deployment *(data table, bên phải)*

- **Loại:** Data table — ~36 hàng (1 hàng = 1 smart meter)

| Cột | Ý nghĩa |
|-----|---------|
| Device ID | UUID smart meter |
| Reading | Chỉ số tích lũy hiện tại (kWh odometer) |
| Total | Tổng kWh đã tiêu thụ |

- **Nguồn:** `stg_mv_dmp_tlm_energy_meter` — lấy bản ghi mới nhất (`MAX(tsDt)`) per device

---

### G4 — Payment Channel Diversity *(donut chart, bên trái)*

- **Loại:** Donut chart
- **Đặc điểm:** Gần như 1 màu chiếm toàn bộ (~99%) — phản ánh mức độ tập trung cao vào 1 kênh thanh toán
- **Nguồn:** `fct_vehicle_events.payment_type` — góc nhìn "đa dạng hóa kênh"

---

### G5 — IoT Data Freshness *(data table, bên phải)*

- **Loại:** Data table dài — hàng trăm hàng (1 hàng = 1 thiết bị IoT)

| Cột | Ý nghĩa |
|-----|---------|
| Timestamp | Thời điểm gửi bản ghi gần nhất |
| Online / Status | `0` = fresh (hoạt động bình thường) · số dương = trễ N giây |

- **Nguồn:** `stg_dmp_device_status_events` — `MAX(eventTime)` per device


---

## Image 5 — Parking Lot Occupancy

**File:** `esg-smart-city-dashboard-parking-energy-2026-06-19T03-00-52.044Z.jpg`  
**Widget MỚI:** O1 · O2 · O3 · O4  
**Tái hiển thị từ Image 4:** K1–K5 · E2 E1 E3 E4 E5 · S1–S5 · G1 G2 G3 G4 G5 *(không thay đổi)*

```
— [Toàn bộ widget Image 4] —
[ O1 — Concurrent Occupancy by Lot    (full width, line)      ]
[ O2 — Avg Dwell Time by Lot/Type ]  [ O3 — Daily Turnover by Lot ]
[ O4 — Entry vs Exit Rate by Hour     (full width, stacked bar) ]
```

---

### O1 — Estimate Concurrent Occupancy by Lot *(line chart, full width)*

### **Thông tin chung**

- **Loại biểu đồ**: Line chart (biểu đồ đường) theo thời gian.

- **Trục Y (dọc)**: Estimated Concurrent Occupancy (Số lượng người chiếm chỗ đồng thời ước tính), đơn vị từ **0 đến 1.2k (1200)**.

- **Trục X (ngang)**: Thời gian, bắt đầu từ **July** đến **May 2026**, với các mốc: July, September, November, 2026, March, May và điểm cuối ghi **10 AM**.

### **Chi tiết các đường biểu diễn**

Có nhiều đường với màu sắc khác nhau, mỗi đường đại diện cho một **Lot** (khu vực) với ID dài:


---

### O2 — Average Dwell Time by Lot & Vehicle Type *(horizontal bar)*

 **Thông tin chung**

- **Loại biểu đồ**: Horizontal Bar Chart (biểu đồ cột ngang).

- **Trục Y (dọc)**: Các khu vực (Lot):

  - Vinhomes OCP1

  - LAB1

  - BQLVH OCP1

- **Trục X (ngang)**: Average Dwell Time (Thời gian dừng trung bình), đơn vị từ **0 đến 120k**.

- **Legend (Loại phương tiện)**:

  - **Blue**: car

  - **Cyan**: bicycle

  - **Pink**: eBicycle

  - **Green**: motorbike

  - **Teal**: eMotorbike

  - **Purple**: eCar

  - **Gray**: All / Inv

---

### O3 — Daily Vehicle Turnover by Lot *(line chart)*

 **Thông tin chung**

- **Loại biểu đồ**: Line chart (biểu đồ đường) theo thời gian.

- **Trục Y (dọc)**: Daily Vehicle Turnover (Số lượng xe ra/vào hàng ngày), đơn vị từ **0 đến 1.2k (1200)**.

- **Trục X (ngang)**: Thời gian, từ **July** đến **May**, kết thúc ở **Wed 03** (có thể là ngày 3/6 hoặc Wednesday 03).

- **Legend (Các Lot)**:

  - **Xanh lá**: BQLVH OCP1

  - **Xanh ngọc**: Vinhomes OCP1

  - **Xanh dương nhạt**: LAB1

  - **Xanh dương đậm**: BQL_Royal_Island

  - **Tím**: <NULL>

  - **Xám**: All / Inv

---
---

### O4 — Entry vs Exit Rate by Hour *(stacked column, full width)*

### **Thông tin chung**

- **Loại biểu đồ**: Stacked Column Chart (biểu đồ cột xếp chồng) theo giờ trong ngày.

- **Trục Y (dọc)**: Số lượng (Entry & Exit Rate), đơn vị từ **0 đến 800**.

- **Trục X (ngang)**: Giờ trong ngày (từ **0** đến **23**).

- **Legend**:

  - **Xanh lá đậm**: OUT (Xe ra)

  - **Xanh ngọc**: IN (Xe vào)

  - **Xám**: All / Inv


---

## Mapping nhanh: Widget → Bảng dữ liệu

| Widget | Bảng chính | Field quan trọng |
|--------|-----------|-----------------|
| K1 | `fct_vehicle_events` | `vehicle_type` IN ('eCar','eBicycle','eMotorbike') |
| K2 | `fct_vehicle_events` | `payment_type` != 'CASH' |
| K3 | `stg_mv_dmp_tlm_energy_meter` | MAX−MIN(`energy_active_kwh_total`) per device |
| K5 | `fct_parking_occupancy` | `current_occupancy` tại MAX(`occupancy_hour`) |
| E2 | `stg_mv_dmp_tlm_energy_meter` | `power_active_kw`, `tsDt` |
| E1 | `stg_mv_dmp_tlm_energy_meter` | MAX−MIN(`energy_active_kwh_total`), MAX−MIN(`water_volume_m3_total`) |
| E3 | `stg_mv_dmp_tlm_energy_meter` | `power_factor`, `energy_active_kwh_total`, `water_volume_m3_total` |
| E4 | `fct_vehicle_events` | `vehicle_type` COUNT(*) |
| E5 | `fct_vehicle_events` | `park_duration_ms`, `vehicle_type` |
| S1 | `fct_vehicle_events` | `payment_type` COUNT(*) |
| S2 | `fct_vehicle_events` | `amount_due`, `vehicle_type` |
| S3 | `fct_vehicle_events` + `dim_parking_lot` | `vehicle_type`, `parking_lot_id` |
| S4 | `fct_parking_occupancy` | `vehicles_in`, `HOUR(occupancy_hour)`, `vehicle_type` |
| S5 | `fct_vehicle_events` | `amount_due`, `payment_type` |
| G1 | *(cần xác nhận)* | — |
| G2 | `fct_parking_occupancy` + `dim_parking_lot` | `current_occupancy`, `area_id` |
| G3 | `stg_mv_dmp_tlm_energy_meter` + `dim_device` | `energy_active_kwh_total`, MAX(`tsDt`) |
| G4 | `fct_vehicle_events` | `payment_type` |
| G5 | `stg_dmp_device_status_events` | MAX(`eventTime`) per device |
| O1 | `fct_parking_occupancy` | `current_occupancy` per lot theo timeline |
| O2 | `fct_vehicle_events` | AVG(`park_duration_ms`) per lot, `vehicle_type` |
| O3 | `fct_vehicle_events` | COUNT(*) per lot per day (vehicle turnover) |
| O4 | `fct_parking_occupancy` | `vehicles_in` vs check-out, GROUP BY `HOUR` |

---

## Lưu ý kỹ thuật

| Quy tắc | Chi tiết |
|---------|---------|
| **Cumulative counter** | `energy_active_kwh_total`, `water_volume_m3_total` là odometer → dùng MAX−MIN per device per period, rồi SUM; KHÔNG `SUM()` trực tiếp |
| **Instant reading** | `power_active_kw`, `power_factor` là giá trị tức thời → dùng AVG/MAX/MIN trực tiếp |
| **EV types** | `eCar`, `eBicycle`, `eMotorbike` (lowercase, bắt đầu `e`) — KHÔNG phải `EV` uppercase |
| **Hàm giờ** | Dùng `HOUR(tsDt)` — KHÔNG dùng `DATE_PART()`, `DAYOFWEEK()`, `EXTRACT(HOUR FROM ...)` |
| **Occupancy** | `current_occupancy` = xe đang có mặt (running balance) · `vehicles_in` = xe vào trong giờ đó (flow) |
| **Revenue** | Dùng `amount_due` (sau giảm giá), không phải `parking_fee` |
