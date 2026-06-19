# Domain: Asset (Location Hierarchy)

Các bảng golden layer cho asset — vị trí vật lý hoặc thiết bị cơ điện mà IoT device được gắn vào.  
Asset tạo thành cây phân cấp: **Building → Floor → Zone → Parking / Equipment**.

---

## Bảng trong domain

| Bảng | Mô tả ngắn | Khi nào dùng |
|---|---|---|
| `dim_asset` | Golden dimension: một row = một asset | Thông tin, filter, đếm asset |
| `dim_asset_profile` | Định nghĩa loại asset: Building, Floor, Zone, Parking, Equipment | Khi cần metadata profile không có trong `dim_asset` |

> Quan hệ device–asset nằm ở domain **Device** (`dim_device_asset`, `dim_device_asset_snapshot`).

---

## Enum & Filter Values

### `dim_asset`

| Cột | Giá trị hợp lệ | Ghi chú |
|---|---|---|
| `asset_type` | `building`, `floor`, `zone`, `parking`, `equipment` | **lowercase** |
| `asset_profile_name` | `Building`, `Floor`, `Zone`, `Parking`, `Equipment` | **Capitalized** — khác với `asset_type` |

**Lưu ý quan trọng:** Hai cột này đại diện cùng khái niệm nhưng khác casing:
- Filter dùng `asset_type` → dùng lowercase: `WHERE asset_type = 'building'`
- Filter dùng `asset_profile_name` → dùng Capitalized: `WHERE asset_profile_name = 'Building'`

Ví dụ tên asset:
- Building: `BUILDING_001`
- Floor: `FLOOR_002`
- Zone: `ZONE_003`

---

## Always-Apply Filters

| Filter | Lý do |
|---|---|
| Phân biệt `asset_type` (lowercase) với `asset_profile_name` (Capitalized) khi viết WHERE | Dùng sai casing sẽ không trả về kết quả |

---

## Table Selection Guide

| Câu hỏi về... | Dùng bảng | Ghi chú |
|---|---|---|
| Thông tin asset | `dim_asset` | — |
| Loại asset (building/floor/...) | `dim_asset.asset_type` | lowercase |
| Profile asset | `dim_asset_profile` | Khi cần cột không có trong `dim_asset` |
| Device gắn vào asset | `dim_device_asset` | Thuộc domain Device |

---

## Join Paths

```
dim_asset
  └─ → dim_asset_profile    ON asset_profile_id = asset_profile_id

dim_asset (cây phân cấp — không có sẵn parent FK)
  Building → Floor → Zone  (không có FK trực tiếp, phải dùng naming convention hoặc stg_dmp_relations)
```

**Lưu ý:** `dim_asset` không có cột `parent_asset_id`. Để trace cây phân cấp Building → Floor → Zone cần query `stg_dmp_relations` hoặc dựa vào `asset_name` convention.

---

## Query Patterns

### Đếm asset theo loại
```sql
SELECT asset_type, COUNT(*) AS total
FROM sdp_golden.dim_asset
GROUP BY asset_type
ORDER BY total;
```

### Danh sách tất cả tòa nhà
```sql
SELECT asset_name, asset_label
FROM sdp_golden.dim_asset
WHERE asset_type = 'building'
ORDER BY asset_name;
```

### Danh sách tầng trong tòa nhà (dùng naming convention)
```sql
-- Giả sử FLOOR_001 thuộc BUILDING_001 theo naming convention
SELECT asset_name, asset_type
FROM sdp_golden.dim_asset
WHERE asset_type = 'floor'
ORDER BY asset_name;
```

### Asset profile nào đang dùng
```sql
SELECT asset_profile_name, COUNT(*) AS asset_count
FROM sdp_golden.dim_asset
GROUP BY asset_profile_name
ORDER BY asset_count DESC;
```

---

## Instruction Coverage

| Instruction name | Trạng thái | Nội dung cần thêm |
|---|---|---|
| `asset_type_casing` | ❌ Chưa có | `asset_type` là lowercase (`building`, `floor`, ...) — `asset_profile_name` là Capitalized (`Building`, `Floor`, ...) |
| `asset_hierarchy` | ❌ Chưa có | Asset tạo cây: Building → Floor → Zone → Parking/Equipment. Không có parent FK trong `dim_asset` |

---

## SQL Pair Coverage

| # | Câu hỏi mẫu | Trạng thái |
|---|---|---|
| SP-ASS-01 | Hệ thống có bao nhiêu tòa nhà? | ❌ Chưa có |
| SP-ASS-02 | Liệt kê các loại asset trong hệ thống | ❌ Chưa có |
| SP-ASS-03 | Danh sách asset theo loại (building/floor/zone) | ❌ Chưa có |
