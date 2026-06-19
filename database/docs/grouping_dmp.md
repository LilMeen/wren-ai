# Domain: DMP (ThingsBoard Staging)

Các bảng staging lấy trực tiếp từ ThingsBoard DMP — raw/lightly transformed.  
**Không dùng trực tiếp cho analysis.** Dùng để debug ETL, lineage, hoặc khi golden tables chưa có cột cần thiết.

---

## Bảng trong domain

| Bảng | Mô tả ngắn | Ưu tiên dùng thay thế |
|---|---|---|
| `stg_dmp_devices` | Device raw từ ThingsBoard | `dim_device` |
| `stg_dmp_device_profiles` | Device profile raw | `dim_device_profile` |
| `stg_dmp_assets` | Asset raw từ ThingsBoard | `dim_asset` |
| `stg_dmp_asset_profiles` | Asset profile raw | `dim_asset_profile` |
| `stg_dmp_relations` | Quan hệ có hướng CONTAINS giữa device–asset | `dim_device_asset` |
| `stg_dmp_device_status_events` | Sự kiện trạng thái thiết bị (ONLINE/OFFLINE/MAINTENANCE) | ← Dùng trực tiếp |
| `stg_dmp_evt_connectivity` | Raw connectivity heartbeat (quality score, ICMP) | ← Dùng khi cần quality score |

---

## Enum & Filter Values

### `stg_dmp_device_status_events`

| Cột | Giá trị hợp lệ | Ghi chú |
|---|---|---|
| `current_status` | `ONLINE`, `OFFLINE`, `MAINTENANCE` | |
| `previous_status` | `ONLINE`, `OFFLINE`, `MAINTENANCE`, `UNKNOWN` | `UNKNOWN` = lần đầu kết nối |
| `event_type` | `STATUS_CHANGE`, `STATUS_HEARTBEAT` | |
| `is_online` | `true`, `false` | Shortcut, không cần filter string |
| `is_status_change_event` | `true`, `false` | Shortcut, không cần filter string |

### `stg_dmp_device_profiles`

| Cột | Giá trị hợp lệ |
|---|---|
| `transport_type` | `MQTT` (hiện tại chỉ có) |
| `provision_type` | `DISABLED` (hiện tại chỉ có) |

### `stg_dmp_relations`

| Cột | Giá trị hợp lệ |
|---|---|
| `from_type` | `DEVICE`, `ASSET` |
| `to_type` | `DEVICE`, `ASSET` |
| `relation_type_group` | `COMMON` |
| `relation_type` | `Contains` |

---

## Always-Apply Filters

| Filter | Lý do |
|---|---|
| `WHERE event_type = 'STATUS_CHANGE'` khi đếm lần đổi trạng thái | Loại bỏ heartbeat định kỳ — chỉ lấy thay đổi thực sự |
| `WHERE is_online = true` thay vì `WHERE current_status = 'ONLINE'` | Ngắn hơn, đã được tính sẵn |

---

## Join Paths

```
stg_dmp_device_status_events
  └─ → dim_device    ON device_id = device_id

stg_dmp_evt_connectivity
  └─ → dim_device    ON deviceid = device_id   ← tên cột lowercase khác!

stg_dmp_relations
  ├─ FROM device     ON from_id = device_id (when from_type = 'DEVICE')
  └─ TO asset        ON to_id   = asset_id  (when to_type  = 'ASSET')
```

**Lưu ý casing:** `stg_dmp_evt_connectivity` dùng tên cột lowercase (`deviceid`, `tenantid`, `customerid`) — khác với tất cả bảng còn lại.

---

## Query Patterns

### Device status hiện tại
```sql
-- Device nào đang OFFLINE?
SELECT DISTINCT device_id, device_code, device_type
FROM sdp_golden.stg_dmp_device_status_events
WHERE event_type = 'STATUS_CHANGE'
  AND current_status = 'OFFLINE';
```

### Đếm lần mất kết nối hôm nay
```sql
SELECT device_id, device_code, COUNT(*) AS disconnect_count
FROM sdp_golden.stg_dmp_device_status_events
WHERE event_type = 'STATUS_CHANGE'
  AND current_status = 'OFFLINE'
  AND event_date = DATE(NOW())
GROUP BY device_id, device_code
ORDER BY disconnect_count DESC;
```

### Tỉ lệ online theo loại device
```sql
SELECT device_type,
       ROUND(100.0 * SUM(CAST(is_online AS INT)) / COUNT(*), 2) AS online_pct
FROM sdp_golden.stg_dmp_device_status_events
GROUP BY device_type;
```

### Quality score trung bình (chỉ dùng bảng evt_connectivity)
```sql
SELECT devicecode, AVG(qualityscore) AS avg_quality
FROM sdp_golden.stg_dmp_evt_connectivity
WHERE processing_day = DATE(NOW())
GROUP BY devicecode
ORDER BY avg_quality ASC;
```

---

## Instruction Coverage

| Instruction name | Trạng thái | Nội dung cần thêm |
|---|---|---|
| `starrocks_dialect` | ✅ Có rồi | — |
| `schema_qualified_tables` | ✅ Có rồi | — |
| `device_status_filter` | ❌ Chưa có | Dùng `event_type = 'STATUS_CHANGE'` để đếm thay đổi thực sự; dùng `is_online` thay vì filter string |
| `connectivity_table_casing` | ❌ Chưa có | `stg_dmp_evt_connectivity` dùng lowercase column names (`deviceid`, không phải `device_id`) |

---

## SQL Pair Coverage

| # | Câu hỏi mẫu | Trạng thái |
|---|---|---|
| SP-DMP-01 | Device nào đang OFFLINE hiện tại? | ❌ Chưa có |
| SP-DMP-02 | Thiết bị nào mất kết nối nhiều lần nhất hôm nay? | ❌ Chưa có |
| SP-DMP-03 | Tỉ lệ online theo loại thiết bị? | ❌ Chưa có |
