# Hướng dẫn: Thêm Relationship và Description vào Wren AI

## Tổng quan

Có 2 file YAML nguồn:
- `database/relationships.yml` — định nghĩa relationships giữa các model
- `database/descriptions.yml` — mô tả cho từng model và column

Script `database/scripts/sync_relationships_from_yaml.py` đọc 2 file trên và đẩy tất cả vào Wren UI qua GraphQL API, sau đó tự động deploy.

---

## Phần 0 — Những phần còn thiếu (gaps cần bổ sung để business → SQL chính xác)

Wren AI cần 5 lớp context để sinh đúng SQL. Project hiện đã có MDL, descriptions, relationships. Bảng dưới liệt kê những gì còn thiếu và nơi thêm vào.

### Gap 1 — Enum/lookup values cho các cột lọc quan trọng

**Vấn đề:** LLM không biết giá trị thực tế của cột, sinh WHERE clause sai casing hoặc sai giá trị.

**Các cột bị thiếu:**

| Cột | Bảng | Giá trị cần document |
|---|---|---|
| `vehicle_type` | `fct_vehicle_events`, `fct_parking_occupancy` | `'CAR'`, `'MOTORBIKE'`, `'TRUCK'`, `'EV'` |
| `payment_type` | `fct_vehicle_events` | `'CASH'`, `'CARD'`, `'E_WALLET'`, `'MONTHLY_PASS'` |
| `service_category` | `fct_vehicle_events` | `'STANDARD'`, `'VIP'`, `'STAFF'` |
| `history_state` | `fct_vehicle_events` | Chỉ dùng `'COMPLETED'` cho giao dịch hợp lệ |
| `direction_type` | `fct_vehicle_events` | Chỉ `'IN_OUT'` là giao dịch hoàn chỉnh (có cả vào lẫn ra) |
| `current_status` | `stg_dmp_device_status_events` | `'ONLINE'`, `'OFFLINE'`, `'MAINTENANCE'` |
| `lpn_cmp` | `fct_vehicle_events` | `'MATCH'` / `'MISMATCH'` |

**Nơi thêm:** `database/instructions.yml` — thêm instruction mới cho mỗi nhóm, với `isDefault: false` và `questions:` gắn với loại câu hỏi tương ứng.

```yaml
- name: vehicle_type_values
  isDefault: false
  questions:
    - How many motorcycles entered today?
    - Revenue breakdown by vehicle type
    - Count cars vs motorbikes
  instruction: >
    The column vehicle_type in fct_vehicle_events and fct_parking_occupancy
    contains exactly four values: 'CAR', 'MOTORBIKE', 'TRUCK', 'EV'.
    Always use these exact values (uppercase) when filtering.
    Example: WHERE vehicle_type = 'MOTORBIKE'

- name: completed_events_filter
  isDefault: false
  questions:
    - Total parking revenue
    - How much did we earn from parking?
    - Average parking fee
  instruction: >
    For revenue and fee analysis, always filter fct_vehicle_events with
    WHERE history_state = 'COMPLETED' AND direction_type = 'IN_OUT'.
    This excludes incomplete, cancelled, or in-progress transactions.
```

---

### Gap 2 — Công thức tính KPI / business metrics

**Vấn đề:** LLM không biết "doanh thu", "thời gian đỗ", "uptime" tính từ cột nào.

**Các metric cần định nghĩa:**

| Metric | Công thức | Cột liên quan |
|---|---|---|
| Doanh thu parking | `SUM(amount_due)` | `fct_vehicle_events.amount_due` WHERE `history_state='COMPLETED'` |
| Thời gian đỗ (phút) | `park_duration_ms / 60000` | `fct_vehicle_events.park_duration_ms` |
| Occupancy hiện tại | `current_occupancy` tại `MAX(occupancy_hour)` per lot | `fct_parking_occupancy.current_occupancy` |
| Device uptime % | `COUNT(*) FILTER (is_online=true) / COUNT(*) * 100` | `stg_dmp_device_status_events.is_online` |
| Giờ cao điểm vào | `SUM(vehicles_in)` GROUP BY `occupancy_time_key` | `fct_parking_occupancy` JOIN `dim_time` |

**Nơi thêm:** `database/instructions.yml` — thêm instruction theo từng domain.

**Lưu ý gap data:** Parking lot **capacity** (tổng số chỗ) không có trong bất kỳ bảng nào. Nếu user hỏi "utilization rate" (occupancy / capacity), không thể tính được. Cần thêm cột `total_capacity` vào `dim_parking_lot` hoặc document rõ limitation này trong description.

---

### Gap 3 — Quy tắc xử lý null và "bản ghi hiện tại"

**Vấn đề:** Nhiều bảng có null mang ý nghĩa nghiệp vụ — LLM có thể include nhầm.

**Các rule cần document:**

| Pattern | Rule |
|---|---|
| Giao dịch xe đang đỗ (chưa ra) | `check_out_at IS NULL` — exclude khỏi revenue query |
| SCD-2 bản ghi hiện tại | `dbt_valid_to IS NULL` trên `dim_device_asset_snapshot`, `dim_parking_lot_snapshot` |
| Occupancy snapshot mới nhất | `ORDER BY occupancy_hour DESC LIMIT 1` per `parking_lot_id` |
| Telemetry mới nhất per device | `ORDER BY ts DESC LIMIT 1` per `deviceId` |

**Nơi thêm:** `database/instructions.yml` (instruction chung `isDefault: true`) và/hoặc `database/descriptions.yml` trong column description của từng cột null tương ứng.

---

### Gap 4 — Question-SQL golden pairs (SQL Pairs thực chất)

**Vấn đề:** Wren AI dùng Qdrant để retrieve SQL examples gần giống câu hỏi → few-shot cho LLM. Hiện project chưa có curated SQL pairs cho domain cụ thể này.

**Cần viết tay ít nhất 15–20 cặp Q&A covering các loại câu hỏi:**

| Loại | Ví dụ câu hỏi |
|---|---|
| Aggregation đơn giản | "Tổng số xe vào hôm nay?" |
| Revenue | "Doanh thu tháng này theo loại xe?" |
| Occupancy | "Bãi nào đang đông nhất lúc 17h?" |
| Temporal | "Peak hour trong tuần qua?" |
| Device health | "Bao nhiêu camera đang offline?" |
| Telemetry | "Camera nào có CPU cao nhất?" |
| Cross-domain | "Tổng phí thu theo ngày trong tuần, phân loại VIP vs Standard?" |

**Nơi thêm:** Wren UI → **Ask** tab → nhập câu hỏi → chạy SQL → bấm **Save as thread** hoặc dùng GraphQL mutation `createThread` để lưu golden pair. Pairs được index vào Qdrant khi deploy.

---

### Gap 5 — Disambiguation rules (khi nhiều bảng có thể trả lời)

**Vấn đề:** Project có staging + golden overlap và nhiều bảng tương tự nhau. LLM cần biết chọn bảng nào.

**Các trường hợp dễ nhầm:**

| Câu hỏi | Dùng bảng này | KHÔNG dùng bảng này | Lý do |
|---|---|---|---|
| "Bao nhiêu xe đang đỗ?" | `fct_parking_occupancy` | `fct_vehicle_events` | Occupancy đã pre-aggregate; vehicle_events cần GROUP BY phức tạp |
| "Thiết bị đang ở asset nào?" | `dim_device_asset` | `dim_device_asset_snapshot` | Snapshot là historical; dim là current-state |
| "Device đang online?" | `stg_dmp_device_status_events` | `stg_dmp_evt_connectivity` | evt_connectivity là raw heartbeat; status_events là derived status |
| "Thông tin device" | `dim_device` | `stg_dmp_devices` | Golden dim đã denormalized; staging cần thêm join |
| "Lịch sử phân công device" | `dim_device_asset_snapshot` | `dim_device_asset` | dim chỉ có current; snapshot có full SCD-2 history |

**Nơi thêm:** `database/descriptions.yml` — cập nhật description của mỗi bảng để nêu rõ *khi nào KHÔNG dùng* (pattern đã có ở `fct_parking_occupancy` nhưng chưa đầy đủ). Cũng có thể thêm instruction trong `instructions.yml` với `isDefault: true`.

---

### Gap 6 — ISO 37122 smart city metric mapping

**Vấn đề:** Project đang nghiên cứu KPIs theo ISO 37122 (xem `database/1_business_analysis/`). Các metric này chưa được map xuống SQL cụ thể.

**Nơi thêm:** `database/instructions.yml` — sau khi `1_business_analysis/` hoàn thiện, thêm instruction mapping tên metric ISO → bảng + công thức SQL tương ứng.

---

### Tóm tắt ưu tiên

| Ưu tiên | Gap | Ảnh hưởng nếu thiếu | Effort |
|---|---|---|---|
| 🔴 1 | Enum values đầy đủ | SQL sai filter → kết quả 0 hoặc sai | Thấp — thêm instruction YAML |
| 🔴 2 | KPI formulas + null rules | Revenue/occupancy tính sai | Thấp — thêm instruction YAML |
| 🟡 3 | Golden SQL pairs (15–20) | Accuracy thấp trên câu hỏi phức tạp | Trung bình — viết tay từng pair |
| 🟡 4 | Disambiguation rules | Dùng nhầm bảng staging thay vì golden | Thấp — cập nhật descriptions |
| 🟢 5 | Parking capacity data | Không tính được utilization rate | Cao — cần thêm data vào StarRocks |
| 🟢 6 | ISO 37122 mapping | Domain KPI không có SQL | Phụ thuộc vào business analysis |

---

Luồng tổng quát:

```
Sửa YAML  →  Chạy sync script  →  Deploy tự động  →  Kiểm tra trên canvas
```

---

## Phần 1 — Thêm Relationship

### 1.1 Kiểm tra trước khi thêm

- Wren UI đang chạy tại `http://localhost:3000`
- Mở trang Modeling (`http://localhost:3000/modeling`) và xác nhận 2 model muốn join đã có trong canvas
- Xác nhận tên cột join tồn tại ở cả 2 bảng (tra trong Wren UI hoặc trong StarRocks)

Ví dụ:
```
stg_dmp_devices.device_profile_id
stg_dmp_device_profiles.device_profile_id
```

### 1.2 Thêm định nghĩa vào relationships.yml

Mở `database/relationships.yml` và thêm một block mới vào cuối (hoặc vào đúng section):

```yaml
- name: ten_bang_trai_ten_bang_phai
  models:
    - ten_bang_trai
    - ten_bang_phai
  join_type: MANY_TO_ONE
  condition: ten_bang_trai.foreign_key = ten_bang_phai.primary_key
  description: >
    Mô tả chi tiết: join từ bảng nào sang bảng nào, qua cột nào,
    mục đích nghiệp vụ là gì, dùng để phân tích gì.
```

**Quy tắc:**

| Trường | Quy tắc |
|--------|---------|
| `name` | Unique, chữ thường, nối `_`. Format: `{bang_trai}_{bang_phai}` hoặc `{bang_trai}_{bang_phai}_{vai_tro}` nếu có nhiều relationship giữa 2 bảng (ví dụ: `fct_vehicle_events_dim_date_check_in`) |
| `models` | Đúng 2 tên bảng, không có schema prefix (dùng `dim_device`, không phải `sdp_golden.dim_device`) |
| `join_type` | `MANY_TO_ONE` cho dim join (phổ biến nhất), `ONE_TO_ONE`, hoặc `ONE_TO_MANY` |
| `condition` | Dùng tên bảng và tên cột thuần, khớp với `referenceName` trong Wren UI |
| `description` | Bắt buộc — viết đủ business context (xem Phần 2.1) |

**Ví dụ thực tế:**

```yaml
- name: fct_vehicle_events_dim_date_check_in
  models:
    - fct_vehicle_events
    - dim_date
  join_type: MANY_TO_ONE
  condition: fct_vehicle_events.check_in_date_key = dim_date.date_key
  description: >
    Joins vehicle events to the date dimension on the check-in date key.
    Use this to analyze arrival patterns by calendar attributes such as
    day of week, month, or public holiday flag.
```

---

## Phần 2 — Thêm Description

### 2.1 Description cho Relationship

Description relationship được đặt trực tiếp trong `relationships.yml` — trường `description` ở mỗi relationship (xem ví dụ trên).

**Gợi ý viết description relationship tốt:**
- Nêu rõ bảng trai/phải và cột join
- Giải thích ý nghĩa nghiệp vụ của mối liên hệ
- Nêu use case điển hình (dùng để phân tích gì)

```yaml
# ❌ Quá chung
description: Links devices to device profiles

# ✅ Đủ context
description: >
  Joins dim_device to dim_device_profile via device_profile_id.
  Use this to enrich device analytics with type label, manufacturer specs,
  and configuration defaults. Required when filtering devices by category.
```

### 2.2 Description cho Model

Mở `database/descriptions.yml` và thêm hoặc cập nhật section cho model:

```yaml
models:
  ten_model:
    description: >
      Mô tả ngắn gọn về bảng này: nguồn gốc dữ liệu, granularity (1 row = gì),
      và mục đích trong data warehouse.
    columns:
      ten_cot_1: Ý nghĩa của cột, đơn vị, hoặc giá trị có thể có.
      ten_cot_2: Nguồn gốc hoặc cách tính của cột.
```

**Gợi ý viết description model tốt:**
- 1 row = gì? (grain)
- Dữ liệu đến từ đâu?
- Dùng để làm gì trong data warehouse?

```yaml
# ❌ Quá chung
dim_device:
  description: Device dimension table.

# ✅ Đủ context
dim_device:
  description: >
    Golden dimension for IoT devices, one row per unique device_id.
    Sourced from stg_dmp_devices after deduplication and profile enrichment.
    Used as the primary device lookup for all fact tables and telemetry views.
  columns:
    device_id: Natural key from the DMP platform, unique per physical device.
    device_sk: Surrogate key, used as FK in all fact and telemetry tables.
    device_profile_id: FK to dim_device_profile for type and config metadata.
    status: Current operational status (ACTIVE / INACTIVE / DECOMMISSIONED).
```

### 2.3 Description cho Column (tổng hợp)

Column descriptions được thêm vào `descriptions.yml` dưới `columns:` của model tương ứng:

```yaml
models:
  fct_vehicle_events:
    description: ...
    columns:
      event_id: Unique identifier for each vehicle entry or exit event.
      parking_lot_id: FK to dim_parking_lot, identifies the parking facility.
      check_in_date_key: FK to dim_date (YYYYMMDD), date when vehicle entered.
      check_out_date_key: FK to dim_date (YYYYMMDD), date when vehicle exited. NULL if still parked.
      check_in_time_key: FK to dim_time (HHMM), time of vehicle entry.
      check_out_time_key: FK to dim_time (HHMM), time of vehicle exit. NULL if still parked.
      duration_minutes: Computed parking duration in minutes. NULL if still parked.
```

---

## Phần 3 — Chạy Script Sync

Sau khi sửa YAML, chạy một lệnh duy nhất:

```powershell
py -3.10 "database/scripts/sync_relationships_from_yaml.py"
```

Script tự động thực hiện theo thứ tự:
1. Đọc `relationships.yml` và `descriptions.yml`
2. So sánh với Wren UI — chỉ **thêm** relationships chưa có (skip nếu đã tồn tại)
3. Cập nhật description cho tất cả models, columns, relationships qua `updateModelMetadata`
4. Deploy lên Wren AI service (Ollama embedding — mất ~30–60s)
5. Báo cáo kết quả

**Output mong đợi khi thành công:**
```
Loaded relationships from YAML: 29
Found models: 43
Existing relations skipped: 29
Relations to add: 1
Saved relations: 1
Updated metadata on 25 models (descriptions + relationships)
Deploy result:
{
  "status": "SUCCESS"
}
Sync status:
{
  "status": "SYNCRONIZED"
}
```

**Dry-run** (chỉ xem, không lưu hoặc deploy):
```powershell
py -3.10 "database/scripts/sync_relationships_from_yaml.py" --dry-run
```

---

## Phần 4 — Kiểm tra trên Canvas

1. Mở `http://localhost:3000/modeling`
2. Refresh trang
3. Đường nối (line) giữa 2 model phải xuất hiện trên canvas
4. Click vào line → kiểm tra description đã hiển thị đúng chưa
5. Click vào model → column descriptions phải hiển thị trong panel bên phải

**Nếu line không xuất hiện, kiểm tra theo thứ tự:**
1. Tên model trong `condition` có đúng không?
2. Tên cột có tồn tại trong cả 2 bảng không?
3. Script có báo `Saved relations: 1` không?
4. Deploy có `status: SUCCESS` không?
5. Đã refresh trang chưa?

---

## Phần 5 — Xử lý lỗi thường gặp

### Deploy timeout (`status: FAILED`)
Ollama embedding chạy local, mất ~30–60s. Nếu vẫn FAILED:
```powershell
# Chờ 2–3 phút, sau đó chạy lại — Wren sẽ tự detect trạng thái
py -3.10 "database/scripts/sync_relationships_from_yaml.py"
```

### `Missing models`
Tên model trong `condition` không khớp với `sourceTableName` trong Wren UI.
- Bỏ schema prefix: dùng `dim_device` thay vì `sdp_golden.dim_device`
- Kiểm tra tên chính xác trong Wren Modeling UI

### `Missing columns`
Tên cột trong `condition` không khớp.
- Kiểm tra `referenceName` của field trong Wren UI (tab Fields của model)
- Thường khớp với tên cột trong StarRocks

---

## Phần 6 — Kiến trúc nội bộ

| Thành phần | Vai trò |
|---|---|
| `database/relationships.yml` | Single source of truth cho tất cả relationships và relationship descriptions |
| `database/descriptions.yml` | Single source of truth cho model/column descriptions |
| `sync_relationships_from_yaml.py` | Script đẩy data lên Wren UI qua GraphQL |
| `saveRelations` (GraphQL) | Tạo relationship mới trong Wren UI project database |
| `updateModelMetadata` (GraphQL) | Cập nhật description cho model, column, relationship |
| `deploy` (GraphQL) | Trigger Wren AI service re-embed toàn bộ schema vào Qdrant |
| Ollama `nomic-embed-text` | Tạo vector embeddings cho semantic search |
| Qdrant | Lưu trữ embeddings để Wren AI tìm kiếm schema khi trả lời câu hỏi |
