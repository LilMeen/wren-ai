# Database Description

Tài liệu mô tả chi tiết từng bảng và cột trong data warehouse.
Layer thứ tự: **Staging → Dimension → Fact/Mart**.
Raw tables không được document ở đây vì không dùng trực tiếp cho analysis.

---

## Staging Tables

### `stg_dmp_devices`

**Nguồn:** `raw_dmp_public_device`
**Mô tả:** Bảng staging chuẩn hóa device từ ThingsBoard DMP. Lightly transformed: đổi tên `id` → `device_id`, chuẩn hóa timestamp. Dùng cho debug/lineage. **Ưu tiên dùng `dim_device` cho analysis.**

| Cột | Kiểu | Mô tả |
|---|---|---|
| `device_id` | UUID | UUID của thiết bị (đổi tên từ `id` trong raw). Dùng để join với dim_device hoặc telemetry tables. |
| `name` | string | Tên thiết bị (ví dụ: BMS_CO2_SENSOR_01061). |
| `label` | string | Label hiển thị của thiết bị, có thể khác `name`. |
| `type` | string | Loại thiết bị dạng raw từ ThingsBoard (ví dụ: bms-co2-sensor, Hikvision Camera). |
| `device_profile_id` | UUID | UUID của device profile (FK tới stg_dmp_device_profiles). |
| `additional_info` | JSON | Metadata bổ sung: site, source, custom fields. |
| `device_data` | JSON | Cấu hình thiết bị: polling interval, v.v. |
| `customer_id` | UUID | UUID của customer sở hữu thiết bị. |
| `tenant_id` | UUID | UUID của ThingsBoard tenant. |
| `firmware_id` | UUID | UUID của firmware được gán. |
| `software_id` | UUID | UUID của software được gán. |
| `external_id` | string | ID định danh trong hệ thống ngoài. |
| `version` | integer | Version counter của record trong ThingsBoard. |
| `processing_day` | date | Ngày partition khi record được extract. |
| `created_at` | timestamp | Thời điểm thiết bị được tạo trong DMP. |
| `_dbt_loaded_at` | timestamp | Thời điểm row được load bởi dbt. |

---

### `stg_dmp_device_profiles`

**Nguồn:** `raw_dmp_public_device_profile`
**Mô tả:** Bảng staging device profile từ ThingsBoard DMP. **Ưu tiên dùng `dim_device_profile` cho analysis.**

| Cột | Kiểu | Mô tả |
|---|---|---|
| `device_profile_id` | UUID | UUID của device profile (đổi tên từ `id`). |
| `name` | string | Tên profile (ví dụ: bms-co2-sensor, CAMERA). |
| `type` | string | Loại profile, thường trùng với `name`. |
| `image` | string | URL hoặc reference ảnh icon của profile. |
| `transport_type` | string | Giao thức kết nối: `MQTT`, `HTTP`, `CoAP`. Hiện tại chỉ có `MQTT`. |
| `provision_type` | string | Chiến lược provision: `DISABLED`, `ALLOW_CREATE_NEW_DEVICES`. Hiện tại chỉ có `DISABLED`. |
| `profile_data` | JSON | Cấu hình nâng cao của profile. |
| `description` | string | Mô tả human-readable. |
| `is_default` | boolean | True nếu là profile mặc định của tenant. |
| `tenant_id` | UUID | UUID của tenant. |
| `firmware_id` | UUID | UUID firmware mặc định cho devices thuộc profile này. |
| `software_id` | UUID | UUID software mặc định. |
| `default_rule_chain_id` | UUID | UUID rule chain mặc định xử lý sự kiện. |
| `default_dashboard_id` | UUID | UUID dashboard mặc định. |
| `default_queue_name` | string | Tên message queue (ví dụ: Main). |
| `provision_device_key` | string | Key dùng trong quá trình provision. |
| `default_edge_rule_chain_id` | UUID | Rule chain dùng trên edge device. |
| `external_id` | string | ID trong hệ thống ngoài. |
| `version` | integer | Version counter. |
| `processing_day` | date | Ngày partition extract. |
| `created_at` | timestamp | Thời điểm profile được tạo. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `stg_dmp_assets`

**Nguồn:** `raw_dmp_public_asset`
**Mô tả:** Bảng staging chuẩn hóa asset từ ThingsBoard DMP. Asset là vị trí vật lý hoặc thiết bị cơ điện mà IoT device được gắn vào (tòa nhà, tầng, khu, bãi xe, thiết bị). **Ưu tiên dùng `dim_asset` cho analysis.**

| Cột | Kiểu | Mô tả |
|---|---|---|
| `asset_id` | UUID | UUID của asset (đổi tên từ `id`). Dùng để join với bridge tables. |
| `name` | string | Tên asset (ví dụ: BUILDING_001, FLOOR_002). |
| `label` | string | Label hiển thị, có thể khác `name`. |
| `type` | string | Loại asset dạng raw (ví dụ: building, floor, zone, parking, equipment). |
| `asset_profile_id` | UUID | UUID của asset profile (FK tới stg_dmp_asset_profiles). |
| `additional_info` | JSON | Metadata bổ sung. |
| `customer_id` | UUID | UUID của customer sở hữu asset. |
| `tenant_id` | UUID | UUID của tenant. |
| `external_id` | string | ID trong hệ thống ngoài. |
| `version` | integer | Version counter. |
| `processing_day` | date | Ngày partition extract. |
| `created_at` | timestamp | Thời điểm asset được tạo. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `stg_dmp_asset_profiles`

**Nguồn:** `raw_dmp_public_asset_profile`
**Mô tả:** Bảng staging asset profile từ ThingsBoard DMP. Định nghĩa các loại asset: Building, Floor, Zone, Parking, Equipment. **Ưu tiên dùng `dim_asset_profile` cho analysis.**

| Cột | Kiểu | Mô tả |
|---|---|---|
| `asset_profile_id` | UUID | UUID của asset profile (đổi tên từ `id`). |
| `name` | string | Tên profile: `Building`, `Floor`, `Zone`, `Parking`, `Equipment`. Viết hoa chữ đầu. |
| `image` | string | URL hoặc reference ảnh icon. |
| `description` | string | Mô tả human-readable. |
| `is_default` | boolean | True nếu là profile mặc định của tenant. |
| `tenant_id` | UUID | UUID của tenant. |
| `default_rule_chain_id` | UUID | UUID rule chain mặc định. |
| `default_dashboard_id` | UUID | UUID dashboard mặc định. |
| `default_queue_name` | string | Tên message queue. |
| `default_edge_rule_chain_id` | UUID | Rule chain cho edge device. |
| `external_id` | string | ID trong hệ thống ngoài. |
| `version` | integer | Version counter. |
| `processing_day` | date | Ngày partition extract. |
| `created_at` | timestamp | Thời điểm profile được tạo. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `stg_dmp_relations`

**Nguồn:** `raw_dmp_public_relation`
**Mô tả:** Bảng staging quan hệ có hướng giữa các entity trong ThingsBoard: `from_id → to_id`. Mỗi row là một quan hệ CONTAINS (device được gán vào asset). Bảng này feed cho `dim_device_asset` và `fct_device_asset_assignment`. **Dùng `dim_device_asset` cho analysis hiện tại.**

| Cột | Kiểu | Mô tả |
|---|---|---|
| `from_id` | UUID | UUID của entity nguồn. Khi `from_type = DEVICE` thì đây là `device_id`. |
| `from_type` | string | Loại entity nguồn: `DEVICE` hoặc `ASSET`. |
| `to_id` | UUID | UUID của entity đích. Khi `to_type = ASSET` thì đây là `asset_id`. |
| `to_type` | string | Loại entity đích: `DEVICE` hoặc `ASSET`. |
| `relation_type_group` | string | Nhóm quan hệ trong ThingsBoard, thường là `COMMON`. |
| `relation_type` | string | Nhãn quan hệ, thường là `Contains`. |
| `additional_info` | JSON | Metadata bổ sung về quan hệ. |
| `version` | integer | Version counter của record. |
| `processing_day` | date | Ngày partition extract. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `stg_dmp_device_status_events`

**Nguồn:** `raw_dmp_evt_connectivity`
**Mô tả:** Bảng staging sự kiện trạng thái thiết bị (ONLINE, OFFLINE, MAINTENANCE). Mỗi row là một sự kiện thay đổi hoặc heartbeat xác nhận trạng thái. Dùng để phân tích uptime, downtime, tần suất mất kết nối. **Dùng bảng này (không dùng `stg_dmp_evt_connectivity`) khi cần phân tích trạng thái thiết bị.**

| Cột | Kiểu | Mô tả |
|---|---|---|
| `event_id` | UUID | UUID định danh duy nhất sự kiện này. |
| `device_id` | UUID | UUID của thiết bị. Join với `dim_device.device_id`. |
| `tenant_id` | UUID | UUID của tenant. |
| `event_type` | string | `STATUS_CHANGE` = đổi trạng thái thực sự; `STATUS_HEARTBEAT` = xác nhận định kỳ không đổi. |
| `source_system` | string | Hệ thống sinh ra event, thường là `DMP`. |
| `device_code` | string | Tên code human-readable của thiết bị. |
| `device_type` | string | Loại thiết bị (ví dụ: CAMERA, bms-co2-sensor). |
| `ip_address` | string | IP của thiết bị tại thời điểm event. |
| `current_status` | string | Trạng thái sau event: `ONLINE`, `OFFLINE`, `MAINTENANCE`. |
| `previous_status` | string | Trạng thái trước event: `ONLINE`, `OFFLINE`, `MAINTENANCE`, `UNKNOWN` (UNKNOWN khi lần đầu kết nối). |
| `status_change_reason` | string | Lý do thay đổi, hiện tại là `state transition`. |
| `event_time` | timestamp | Thời điểm chính xác của event. |
| `event_date` | date | Ngày của event (partition key). |
| `event_hour` | integer | Giờ trong ngày khi event xảy ra. |
| `processing_day` | date | Ngày partition load data. |
| `is_online` | boolean | Shortcut: True nếu `current_status = ONLINE`. Dùng trực tiếp thay vì filter string. |
| `is_status_change_event` | boolean | True nếu là `STATUS_CHANGE` (không phải heartbeat). Dùng để đếm số lần đổi trạng thái thực sự. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `stg_dmp_evt_connectivity`

**Nguồn:** `raw_dmp_evt_connectivity`
**Mô tả:** Bảng staging raw connectivity telemetry từ DMP ở mức heartbeat. Chứa quality score và lý do offline. **Mức thấp hơn `stg_dmp_device_status_events`** — dùng bảng này chỉ khi cần quality score hoặc ICMP reachability. Lưu ý: tên cột lowercase (deviceid, tenantid) khác với các bảng khác.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `msgtype` | string | Loại message: `CONNECTIVITY`. |
| `deviceid` | UUID | UUID của thiết bị (lowercase). Join với `dim_device.device_id`. |
| `tenantid` | UUID | UUID của tenant (lowercase). |
| `customerid` | UUID | UUID của customer (lowercase). |
| `devicecode` | string | Tên code human-readable của thiết bị. |
| `status` | string | Trạng thái kết nối: `ONLINE` hoặc `OFFLINE`. |
| `offlinereason` | string | Lý do offline: `NO_HEARTBEAT`, `TIMEOUT`, v.v. |
| `qualityscore` | float | Điểm chất lượng kết nối (0–100). Càng cao càng tốt. |
| `icmpreachable` | boolean | True nếu thiết bị phản hồi ICMP ping. |
| `ts` | bigint | Thời điểm event dạng Unix epoch milliseconds. |
| `processing_day` | date | Ngày partition load data. |

---

### `stg_vehicle_histories`

**Nguồn:** `raw_parking_db_vehicle_histories`
**Mô tả:** Bảng staging lịch sử xe vào/ra bãi từ hệ thống parking Couchbase. Mỗi row là một giao dịch đỗ xe (vào + ra). Đã chuẩn hóa timestamp và monetary fields. **Ưu tiên dùng `fct_vehicle_events` cho analysis** vì đã có date/time keys và clean hơn. Dùng bảng này khi cần debug ETL hoặc các cột không có trong fact (lpn_camera_in, lpn_in_edited, ...).

| Cột | Kiểu | Mô tả |
|---|---|---|
| `event_id` | UUID | UUID của giao dịch đỗ xe. |
| `card_number` | string | Số thẻ vật lý dùng để vào/ra. |
| `lpn` | string | Biển số xe. |
| `lpn_cmp` | string | Kết quả so khớp biển số: `MATCH` / `MISMATCH`. |
| `lpn_camera_in` | string | Biển số camera đọc được tại cổng vào. |
| `lpn_in_edited` | string | Biển số đã được sửa tay tại cổng vào. |
| `lpn_camera_out` | string | Biển số camera đọc được tại cổng ra. |
| `lpn_out_edited` | string | Biển số đã được sửa tay tại cổng ra. |
| `service_id` | string | ID gói dịch vụ đỗ xe: `SVC_01` đến `SVC_05`. |
| `service_name` | string | Tên gói: `Hourly Parking`, `Monthly Parking`, `Visitor Parking`. |
| `owner_customer_id` | UUID | UUID của operator/chủ bãi xe. |
| `org_unit_code` | string | Mã đơn vị tổ chức. |
| `org_unit_name` | string | Tên đơn vị tổ chức. |
| `pk_lot_id` | string | ID bãi xe (ví dụ: LOT_001). Join với `dim_parking_lot.pk_lot_id`. |
| `pk_lot_name` | string | Tên bãi xe. |
| `direction_type` | string | Hướng giao dịch: `IN_OUT` = giao dịch hoàn chỉnh (có cả vào lẫn ra). |
| `check_in_at_raw` | string | Chuỗi timestamp check-in dạng raw từ nguồn. |
| `check_out_at_raw` | string | Chuỗi timestamp check-out dạng raw từ nguồn. |
| `check_in_at` | timestamp | Timestamp check-in đã được parse. |
| `check_out_at` | timestamp | Timestamp check-out đã được parse. NULL nếu xe chưa ra. |
| `payment_type` | string | Phương thức thanh toán: `CASH`, `CARD`, `E_WALLET`, `MONTHLY_PASS`. |
| `vehicle_type` | string | Loại xe: `CAR`, `MOTORBIKE`, `TRUCK`, `EV`. |
| `park_duration_ms` | bigint | Thời gian đỗ tính bằng milliseconds. Chia 60000 để ra phút. |
| `history_state` | string | Trạng thái xử lý: `COMPLETED` = giao dịch hợp lệ hoàn chỉnh. |
| `service_category` | string | Tier dịch vụ: `STANDARD`, `VIP`, `STAFF`. |
| `event_date` | date | Ngày của sự kiện (partition key). |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `stg_mv_dmp_tlm_camera`

**Nguồn:** `raw_dmp_tlm_raw`
**Mô tả:** Materialized view telemetry camera. Filter `deviceType = CAMERA` từ raw telemetry và parse JSON thành các typed fields. Refresh bất đồng bộ. Join với `dim_device` qua `deviceId = device_id`.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `deviceId` | UUID | UUID của camera. Join với `dim_device.device_id`. |
| `ts` | bigint | Thời điểm event dạng Unix epoch milliseconds. |
| `eventTime` | timestamp | Thời điểm telemetry event. |
| `tenantId` | UUID | UUID của tenant. |
| `customerId` | UUID | UUID của customer. |
| `cpu_usage_pct` | float | Mức sử dụng CPU (0–100%). |
| `memory_free_mb` | float | Bộ nhớ còn trống (MB). |
| `memory_used_mb` | float | Bộ nhớ đang dùng (MB). |
| `fan_state` | boolean | Trạng thái quạt: True = đang chạy. |
| `heater_state` | boolean | Trạng thái bộ sưởi: True = đang bật. |
| `reboot_count_total` | integer | Tổng số lần reboot từ lần reset gần nhất. |
| `uptime_seconds` | integer | Số giây từ lần reboot gần nhất. |
| `tsDt` | timestamp | Datetime version của `ts` epoch. |

---

### `stg_mv_dmp_tlm_chiller`

**Nguồn:** `raw_dmp_tlm_raw`
**Mô tả:** Materialized view telemetry chiller (HVAC). Filter `deviceType = CHILLER` và parse trạng thái vận hành, fault, valve. Join với `dim_device` qua `deviceId = device_id`.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `deviceId` | UUID | UUID của chiller. Join với `dim_device.device_id`. |
| `ts` | bigint | Thời điểm event dạng Unix epoch milliseconds. |
| `eventTime` | timestamp | Thời điểm telemetry event. |
| `tenantId` | UUID | UUID của tenant. |
| `customerId` | UUID | UUID của customer. |
| `chiller_state` | boolean | Trạng thái hoạt động: True = chiller đang chạy. |
| `fault` | boolean | True nếu đang có tình trạng lỗi (fault condition). |
| `mode` | boolean | Flag chế độ vận hành. |
| `return_valve_open_limit` | boolean | Van hồi đang ở vị trí mở giới hạn. |
| `supply_valve_open_limit` | boolean | Van cấp đang ở vị trí mở giới hạn. |
| `supply_valve_close_limit` | boolean | Van cấp đang ở vị trí đóng giới hạn. |
| `tsDt` | timestamp | Datetime version của `ts` epoch. |

---

### `stg_mv_dmp_tlm_energy_meter`

**Nguồn:** `raw_dmp_tlm_raw`
**Mô tả:** Materialized view telemetry đồng hồ điện. Filter `deviceType = ENERGY_METER` và parse các chỉ số điện/nước. Join với `dim_device` qua `deviceId = device_id`.
**Lưu ý:** `energy_active_kwh_total` là cumulative counter — để tính tiêu thụ trong kỳ dùng `MAX - MIN` trong khoảng thời gian đó.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `deviceId` | UUID | UUID của đồng hồ điện. Join với `dim_device.device_id`. |
| `ts` | bigint | Thời điểm event dạng Unix epoch milliseconds. |
| `eventTime` | timestamp | Thời điểm telemetry event. |
| `tenantId` | UUID | UUID của tenant. |
| `customerId` | UUID | UUID của customer. |
| `current_a` | float | Dòng điện (Ampere). |
| `energy_active_kwh_total` | float | Tổng điện năng tích lũy (kWh) từ đầu — **cumulative counter, không phải delta**. |
| `energy_reactive_kvarh_total` | float | Tổng điện phản kháng tích lũy (kVarh). |
| `frequency_hz` | float | Tần số lưới điện (Hz, chuẩn 50 Hz). |
| `power_active_kw` | float | Công suất tác dụng tức thời (kW). Dùng để xem mức tiêu thụ hiện tại. |
| `power_factor` | float | Hệ số công suất (0–1). Càng gần 1 càng hiệu quả. |
| `voltage_l1_v` | float | Điện áp pha L1 (Volt). |
| `voltage_l2_v` | float | Điện áp pha L2 (Volt). |
| `voltage_l3_v` | float | Điện áp pha L3 (Volt). |
| `water_volume_m3_total` | float | Tổng lượng nước tích lũy (m³) — nếu có đồng hồ nước gắn kèm. |
| `tsDt` | timestamp | Datetime version của `ts` epoch. |

---

### `stg_mv_dmp_tlm_nvr`

**Nguồn:** `raw_dmp_tlm_raw`
**Mô tả:** Materialized view telemetry NVR (Network Video Recorder). Filter `deviceType = NVR` và parse system health metrics. Join với `dim_device` qua `deviceId = device_id`.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `deviceId` | UUID | UUID của NVR. Join với `dim_device.device_id`. |
| `ts` | bigint | Thời điểm event dạng Unix epoch milliseconds. |
| `eventTime` | timestamp | Thời điểm telemetry event. |
| `tenantId` | UUID | UUID của tenant. |
| `customerId` | UUID | UUID của customer. |
| `cpu_usage_pct` | float | Mức sử dụng CPU (0–100%). |
| `memory_free_mb` | float | Bộ nhớ còn trống (MB). |
| `memory_used_mb` | float | Bộ nhớ đang dùng (MB). |
| `uptime_seconds` | integer | Số giây từ lần reboot gần nhất. |
| `tsDt` | timestamp | Datetime version của `ts` epoch. |

---

## Dimension Tables

### `dim_device`

**Nguồn:** `stg_dmp_devices`, `stg_dmp_device_profiles`
**Mô tả:** Golden dimension cho IoT devices. Mỗi row = một device duy nhất đã đăng ký trong DMP. Đã denormalize thông tin profile — không cần join thêm khi chỉ cần profile name/type. **Bảng chính cho mọi query liên quan đến thiết bị.**

| Cột | Kiểu | Mô tả |
|---|---|---|
| `device_sk` | string | Surrogate key (SHA-1 hash), định danh duy nhất row. Dùng làm FK trong fact/bridge tables. |
| `device_id` | UUID | UUID của thiết bị trong ThingsBoard. Dùng để join với telemetry và staging tables. |
| `device_name` | string | Tên human-readable (ví dụ: BMS_CO2_SENSOR_01061). |
| `device_label` | string | Label hiển thị, có thể khác `device_name`. |
| `device_type` | string | Loại thiết bị từ DMP. Nhiều giá trị: `Hikvision Camera`, `Hikvision NVR`, `bms-chiller`, `bms-co2-sensor`, `siemens-chiller`, v.v. Dùng LIKE khi filter theo nhóm. |
| `additional_info` | JSON | Metadata bổ sung: site, source, custom fields. |
| `device_data` | JSON | Cấu hình thiết bị. |
| `customer_id` | UUID | UUID của customer sở hữu thiết bị. |
| `tenant_id` | UUID | UUID của ThingsBoard tenant. |
| `firmware_id` | UUID | UUID firmware đang dùng. |
| `software_id` | UUID | UUID software đang dùng. |
| `external_id` | string | ID định danh trong hệ thống ngoài. |
| `device_profile_id` | UUID | UUID của device profile (FK tới `dim_device_profile`). |
| `device_profile_name` | string | Tên device profile (denormalized từ `dim_device_profile`). |
| `device_profile_description` | string | Mô tả device profile (denormalized). |
| `transport_type` | string | Giao thức kết nối: hiện tại chỉ có `MQTT`. |
| `provision_type` | string | Chiến lược provision: hiện tại chỉ có `DISABLED`. |
| `device_profile_is_default` | boolean | True nếu device profile là mặc định của tenant. |
| `created_at` | timestamp | Thời điểm thiết bị được đăng ký vào DMP. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `dim_device_profile`

**Nguồn:** `stg_dmp_device_profiles`
**Mô tả:** Golden dimension cho device profiles. Mỗi profile định nghĩa một class thiết bị IoT: giao thức, firmware, rule chain, dashboard. Join với `dim_device` qua `device_profile_id` khi cần metadata profile không có sẵn trong `dim_device`.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `device_profile_sk` | string | Surrogate key của profile row. |
| `device_profile_id` | UUID | UUID của device profile. |
| `device_profile_name` | string | Tên profile (ví dụ: bms-co2-sensor, CAMERA). |
| `profile_type` | string | Loại category, thường trùng với `device_profile_name`. |
| `transport_type` | string | Giao thức kết nối: `MQTT`, `HTTP`, `CoAP`. |
| `provision_type` | string | Chiến lược provision cho thiết bị thuộc profile này. |
| `profile_data` | JSON | Cấu hình nâng cao. |
| `device_profile_description` | string | Mô tả human-readable. |
| `is_default` | boolean | True nếu là profile mặc định của tenant. |
| `tenant_id` | UUID | UUID của tenant. |
| `firmware_id` | UUID | UUID firmware mặc định. |
| `software_id` | UUID | UUID software mặc định. |
| `default_rule_chain_id` | UUID | UUID rule chain xử lý sự kiện mặc định. |
| `default_dashboard_id` | UUID | UUID dashboard mặc định. |
| `default_queue_name` | string | Tên message queue (ví dụ: Main). |
| `default_edge_rule_chain_id` | UUID | Rule chain cho edge device. |
| `provision_device_key` | string | Key dùng khi provision thiết bị. |
| `image` | string | URL hoặc reference ảnh icon. |
| `created_at` | timestamp | Thời điểm profile được tạo. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `dim_asset`

**Nguồn:** `stg_dmp_assets`, `stg_dmp_asset_profiles`
**Mô tả:** Golden dimension cho assets — vị trí vật lý hoặc thiết bị cơ điện mà IoT device được gắn vào. Ví dụ: tòa nhà, tầng, khu, bãi xe, HVAC. Đã denormalize thông tin profile. Mỗi asset có thể có một hoặc nhiều device qua `dim_device_asset` hoặc `fct_device_asset_assignment`.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `asset_sk` | string | Surrogate key định danh duy nhất asset row. |
| `asset_id` | UUID | UUID của asset trong ThingsBoard. Dùng để join với bridge tables. |
| `asset_name` | string | Tên human-readable (ví dụ: BUILDING_001, FLOOR_002). |
| `asset_label` | string | Label hiển thị. |
| `asset_type` | string | Loại asset (lowercase): `building`, `floor`, `zone`, `parking`, `equipment`. |
| `additional_info` | JSON | Metadata bổ sung. |
| `customer_id` | UUID | UUID của customer sở hữu asset. |
| `tenant_id` | UUID | UUID của tenant. |
| `external_id` | string | ID trong hệ thống ngoài. |
| `asset_profile_id` | UUID | UUID của asset profile (FK tới `dim_asset_profile`). |
| `asset_profile_name` | string | Tên profile (Capitalized): `Building`, `Floor`, `Zone`, `Parking`, `Equipment`. Khác với `asset_type` là lowercase. |
| `asset_profile_description` | string | Mô tả asset profile (denormalized). |
| `asset_profile_is_default` | boolean | True nếu asset profile là mặc định của tenant. |
| `default_rule_chain_id` | UUID | UUID rule chain mặc định của asset profile. |
| `default_dashboard_id` | UUID | UUID dashboard mặc định. |
| `default_queue_name` | string | Tên message queue. |
| `default_edge_rule_chain_id` | UUID | Edge rule chain UUID. |
| `created_at` | timestamp | Thời điểm asset được tạo trong DMP. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `dim_asset_profile`

**Nguồn:** `stg_dmp_asset_profiles`
**Mô tả:** Golden dimension cho asset profiles. Định nghĩa các loại asset: Building, Floor, Zone, Parking, Equipment. Join với `dim_asset` qua `asset_profile_id` khi cần metadata profile không có sẵn trong `dim_asset`.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `asset_profile_sk` | string | Surrogate key của profile row. |
| `asset_profile_id` | UUID | UUID của asset profile. |
| `asset_profile_name` | string | Tên profile: `Building`, `Floor`, `Zone`, `Parking`, `Equipment`. |
| `asset_profile_description` | string | Mô tả human-readable. |
| `is_default` | boolean | True nếu là profile mặc định của tenant. |
| `tenant_id` | UUID | UUID của tenant. |
| `default_rule_chain_id` | UUID | UUID rule chain mặc định. |
| `default_dashboard_id` | UUID | UUID dashboard mặc định. |
| `default_queue_name` | string | Tên message queue. |
| `default_edge_rule_chain_id` | UUID | Edge rule chain UUID. |
| `image` | string | URL hoặc reference ảnh icon. |
| `created_at` | timestamp | Thời điểm profile được tạo. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `dim_device_asset`

**Nguồn:** `dim_device`, `dim_asset`, `stg_dmp_relations`
**Mô tả:** Current-state bridge table liên kết device với asset đang được gán. Mỗi row = một cặp device–asset đang active. Đã denormalize đầy đủ thông tin device và asset — không cần join thêm. **Dùng bảng này cho câu hỏi hiện tại. Dùng `dim_device_asset_snapshot` cho câu hỏi lịch sử.**

| Cột | Kiểu | Mô tả |
|---|---|---|
| `device_sk` | string | Surrogate key của device. |
| `asset_sk` | string | Surrogate key của asset. |
| `device_id` | UUID | UUID của device. Join với `dim_device` hoặc telemetry tables. |
| `device_name` | string | Tên device. |
| `device_label` | string | Label của device. |
| `device_type` | string | Loại device. |
| `device_additional_info` | JSON | Metadata device. |
| `device_data` | JSON | Cấu hình device. |
| `device_customer_id` | UUID | Customer UUID của device. |
| `device_tenant_id` | UUID | Tenant UUID của device. |
| `firmware_id` | UUID | Firmware UUID của device. |
| `software_id` | UUID | Software UUID của device. |
| `device_external_id` | string | External ID của device. |
| `device_profile_name` | string | Tên profile của device. |
| `device_profile_description` | string | Mô tả profile của device. |
| `transport_type` | string | Giao thức kết nối của device. |
| `provision_type` | string | Chiến lược provision của device. |
| `device_profile_is_default` | boolean | Profile có phải mặc định không. |
| `device_created_at` | timestamp | Thời điểm device được tạo. |
| `asset_id` | UUID | UUID của asset. Join với `dim_asset`. |
| `asset_name` | string | Tên asset. |
| `asset_label` | string | Label của asset. |
| `asset_type` | string | Loại asset (lowercase): `building`, `floor`, `zone`, `parking`, `equipment`. |
| `asset_additional_info` | JSON | Metadata asset. |
| `asset_customer_id` | UUID | Customer UUID của asset. |
| `asset_tenant_id` | UUID | Tenant UUID của asset. |
| `asset_external_id` | string | External ID của asset. |
| `asset_profile_name` | string | Tên profile của asset (Capitalized). |
| `asset_profile_description` | string | Mô tả profile của asset. |
| `asset_profile_is_default` | boolean | Asset profile có phải mặc định không. |
| `default_rule_chain_id` | UUID | Rule chain UUID của asset. |
| `default_dashboard_id` | UUID | Dashboard UUID của asset. |
| `default_queue_name` | string | Message queue routing name. |
| `default_edge_rule_chain_id` | UUID | Edge rule chain UUID. |
| `asset_created_at` | timestamp | Thời điểm asset được tạo. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `dim_device_asset_snapshot`

**Nguồn:** `dim_device_asset`
**Mô tả:** SCD Type-2 snapshot lịch sử quan hệ device–asset. Track khi nào device được di chuyển từ asset này sang asset khác. **Dùng bảng này cho câu hỏi point-in-time** (ví dụ: "Device X đang ở asset nào vào ngày 15/01?"). Dùng `dim_device_asset` cho trạng thái hiện tại. Lọc `dbt_valid_to IS NULL` để lấy bản ghi đang active.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `device_asset_sk` | string | Surrogate key của snapshot record này. |
| `device_sk` | string | Surrogate key của device. |
| `asset_sk` | string | Surrogate key của asset. |
| `device_id` | UUID | UUID của device. |
| `asset_id` | UUID | UUID của asset. |
| `device_name` | string | Tên device tại thời điểm record này. |
| `device_type` | string | Loại device. |
| `device_tenant_id` | UUID | Tenant UUID của device. |
| `asset_name` | string | Tên asset tại thời điểm record này. |
| `asset_type` | string | Loại asset. |
| `asset_tenant_id` | UUID | Tenant UUID của asset. |
| `dbt_scd_id` | string | Internal dbt SCD record identifier. |
| `dbt_updated_at` | timestamp | Thời điểm SCD record được cập nhật lần cuối. |
| `dbt_valid_from` | timestamp | Bắt đầu khoảng thời gian hiệu lực của assignment này. |
| `dbt_valid_to` | timestamp | Kết thúc khoảng thời gian hiệu lực. **NULL hoặc empty = bản ghi đang active hiện tại.** |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `dim_parking_lot`

**Nguồn:** `stg_vehicle_histories`
**Mô tả:** Current-state dimension cho bãi đỗ xe. Mỗi row = một bãi. Hệ thống có 40 bãi (`LOT_001` – `LOT_040`) chia đều vào 20 khu vực (`AREA_01` – `AREA_20`), mỗi khu 2 bãi. **Bảng master cho mọi query về bãi xe.** Lưu ý: chưa có cột `total_capacity` — không thể tính utilization rate.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `pk_lot_id` | string | Primary key của bãi xe (ví dụ: `LOT_001`). Dùng để join với `fct_vehicle_events.parking_lot_id` và `fct_parking_occupancy.parking_lot_id`. |
| `pk_lot_name` | string | Tên human-readable (ví dụ: `Parking Lot 001`). |
| `area_id` | string | Mã khu vực (ví dụ: `AREA_01`). Mỗi khu vực chứa đúng 2 bãi. Dùng để group query theo khu vực. |

---

### `dim_parking_lot_snapshot`

**Nguồn:** `dim_parking_lot`
**Mô tả:** SCD Type-2 snapshot lịch sử bãi đỗ xe. Track thay đổi tên bãi hoặc khu vực theo thời gian. **Dùng `dim_parking_lot` cho trạng thái hiện tại.** Lọc `dbt_valid_to IS NULL` để lấy bản ghi đang active.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `pk_lot_id` | string | ID bãi xe. |
| `pk_lot_name` | string | Tên bãi xe tại thời điểm snapshot này. |
| `area_id` | string | Khu vực tại thời điểm snapshot này. |
| `dbt_scd_id` | string | Internal dbt SCD record identifier. |
| `dbt_updated_at` | timestamp | Thời điểm SCD record được cập nhật. |
| `dbt_valid_from` | timestamp | Bắt đầu khoảng thời gian hiệu lực. |
| `dbt_valid_to` | timestamp | Kết thúc khoảng thời gian hiệu lực. **NULL hoặc empty = bản ghi đang active.** |

---

### `dim_date`

**Nguồn:** Generated
**Mô tả:** Date dimension. Mỗi row = một ngày calendar. Join bằng integer date key định dạng YYYYMMDD (ví dụ: `20260601`). Dùng để filter/group theo ngày, tuần, tháng, quý, weekday/weekend.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `date_key` | integer | Date key dạng YYYYMMDD (ví dụ: `20260601`). **Primary key**, dùng để join với fact tables. |
| `full_date` | string | Ngày ISO format (ví dụ: `2026-06-01`). |
| `year` | integer | Năm (ví dụ: 2026). |
| `quarter` | integer | Quý 1–4. |
| `month` | integer | Tháng 1–12. |
| `day` | integer | Ngày trong tháng 1–31. |
| `year_month` | string | Nhãn năm-tháng (ví dụ: `2026-06`). Dùng để group theo tháng. |
| `year_week` | string | ISO year-week (ví dụ: `2026-W23`). Dùng để group theo tuần. |
| `day_of_year` | integer | Số thứ tự ngày trong năm (1–366). |
| `day_of_week` | integer | Số thứ tự ngày trong tuần theo ISO (1=Thứ Hai … 7=Chủ Nhật). |
| `day_name` | string | Tên đầy đủ ngày trong tuần (Monday, Tuesday, …). |
| `day_name_short` | string | Tên viết tắt (Mon, Tue, …). |
| `is_weekend` | boolean | True cho Saturday và Sunday. Dùng để so sánh cuối tuần vs ngày thường. |
| `month_name` | string | Tên đầy đủ tháng (January, February, …). |
| `month_name_short` | string | Tên viết tắt tháng (Jan, Feb, …). |

---

### `dim_time`

**Nguồn:** Generated
**Mô tả:** Time dimension với 96 rows, mỗi row = một slot 15 phút (00:00–23:45). Time key là chuỗi 4 ký tự HHMM (ví dụ: `'0930'` cho 09:30). Dùng để phân tích theo giờ trong ngày: giờ cao điểm, peak/off-peak, buổi sáng/chiều/tối.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `time_key` | string | Time key 4 ký tự HHMM (ví dụ: `'0930'`). **Primary key**, dùng để join với fact tables. |
| `time_of_day` | string | Thời gian đầy đủ (ví dụ: `'09:30:00'`). |
| `hour` | integer | Giờ trong ngày 0–23. |
| `minute` | integer | Phút trong giờ: 0, 15, 30, hoặc 45 (granularity 15 phút). |
| `time_label` | string | Nhãn ngắn `HH:MM` (ví dụ: `'09:30'`). |
| `hour_label` | string | Nhãn theo giờ `HH:00` (ví dụ: `'09:00'`). Dùng để group theo giờ. |
| `period` | string | Buổi trong ngày: `night` (00–05h), `morning` (06–11h), `afternoon` (12–17h), `evening` (18–23h). |
| `time_of_day_label` | string | Giống `time_label`, dùng để hiển thị. |
| `minutes_since_midnight` | integer | Tổng số phút từ nửa đêm (ví dụ: 570 cho 09:30). Dùng để filter khoảng thời gian dạng số. |

---

## Fact / Mart Tables

### `fct_device_asset_assignment`

**Nguồn:** `dim_device`, `dim_asset`, `stg_dmp_relations`
**Mô tả:** Fact table ghi nhận quan hệ gán device vào asset lấy từ relation graph của DMP. Mỗi row = một quan hệ CONTAINS (device được gán vào asset). Dùng để đếm assignments, trace lineage, audit lịch sử quan hệ. Khác `dim_device_asset` (current-state denorm) — bảng này là event log nguyên gốc của quan hệ.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `device_sk` | string | Surrogate key của device được gán. |
| `asset_sk` | string | Surrogate key của asset nhận device. |
| `device_id` | UUID | UUID của device. |
| `device_tenant_id` | UUID | Tenant UUID của device. |
| `asset_id` | UUID | UUID của asset. |
| `asset_tenant_id` | UUID | Tenant UUID của asset. |
| `relation_type_group` | string | Nhóm quan hệ trong ThingsBoard: thường là `COMMON`. |
| `relation_type` | string | Nhãn quan hệ: thường là `Contains`. |
| `relation_additional_info` | JSON | Metadata bổ sung về quan hệ. |
| `relation_version` | integer | Version counter của relation record. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `fct_vehicle_events`

**Nguồn:** `stg_vehicle_histories`, `dim_date`, `dim_time`, `dim_parking_lot`
**Mô tả:** Golden fact table cho từng lượt xe vào/ra bãi đỗ xe. Mỗi row = một giao dịch hoàn chỉnh. Chứa đầy đủ: timestamp, phí, làn/cổng, biển số, thanh toán, date/time keys để join dimension. **Dùng bảng này cho revenue, dwell time, lane analysis. Dùng `fct_parking_occupancy` (không dùng bảng này) cho câu hỏi occupancy/peak hour** vì đã pre-aggregate và nhanh hơn.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `event_id` | UUID | UUID định danh duy nhất giao dịch này. |
| `check_in_at` | timestamp | Thời điểm xe vào bãi. |
| `check_out_at` | timestamp | Thời điểm xe ra bãi. NULL nếu xe chưa ra (đang đỗ). |
| `event_date` | date | Ngày của sự kiện (ISO date string). |
| `check_in_timestamp` | bigint | Unix epoch milliseconds của check-in. |
| `check_out_timestamp` | bigint | Unix epoch milliseconds của check-out. |
| `parking_lot_id` | string | ID bãi xe (ví dụ: `LOT_001`). Join với `dim_parking_lot.pk_lot_id`. |
| `vehicle_type` | string | Loại xe: `CAR`, `MOTORBIKE`, `TRUCK`, `EV`. |
| `direction_type` | string | `IN_OUT` = giao dịch hoàn chỉnh (vào và ra). |
| `history_state` | string | Trạng thái xử lý: `COMPLETED` = hợp lệ. **Luôn filter `WHERE history_state = 'COMPLETED'`** khi tính doanh thu. |
| `payment_type` | string | Phương thức: `CASH`, `CARD`, `E_WALLET`, `MONTHLY_PASS`. |
| `lpn` | string | Biển số xe. |
| `lpn_cmp` | string | Kết quả so khớp biển số: `MATCH` / `MISMATCH`. |
| `service_id` | string | ID gói dịch vụ: `SVC_01` – `SVC_05`. |
| `service_name` | string | Tên gói: `Hourly Parking`, `Monthly Parking`, `Visitor Parking`. |
| `service_category` | string | Tier dịch vụ: `STANDARD`, `VIP`, `STAFF`. |
| `owner_customer_id` | UUID | UUID của operator/chủ bãi. |
| `card_number` | string | Số thẻ vật lý dùng vào/ra. |
| `use_voucher` | boolean | True nếu có áp dụng voucher (~10% giao dịch). |
| `wallet_balance_before` | float | Số dư ví trước giao dịch (VND). |
| `wallet_balance_after` | float | Số dư ví sau giao dịch (VND). |
| `total_topup` | float | Số tiền nạp thêm vào ví trong giao dịch này (VND). |
| `bank_transfer` | float | Số tiền thanh toán qua chuyển khoản (VND). |
| `parking_fee` | float | Phí đỗ xe gốc trước giảm giá (VND). Range: 0–50,000. |
| `lost_card_fee` | float | Phí phạt thẻ mất (VND). 0 nếu không mất thẻ. |
| `promotion_amount` | float | Giảm giá thông thường (VND). |
| `promotion_vinfast_amount` | float | Giảm giá riêng cho xe VinFast (VND). |
| `amount_due` | float | **Số tiền thực tế phải trả sau tất cả giảm giá (VND).** Range: 0–50,000. Dùng cột này để tính doanh thu. |
| `used_change` | float | Tiền thối lại khách hàng (VND). |
| `park_duration_ms` | bigint | Thời gian đỗ xe tính bằng milliseconds. **Chia 60,000 để ra phút.** Range: 20–480 phút trong data hiện tại. |
| `org_unit_code` | string | Mã đơn vị tổ chức. |
| `org_unit_name` | string | Tên đơn vị tổ chức. |
| `checkin_customer_id` | UUID | UUID customer ghi nhận lúc check-in. |
| `checkout_customer_id` | UUID | UUID customer ghi nhận lúc check-out. |
| `entry_point_in_name` | string | Tên cổng vào: `Gate In 1`, `Gate In 2`, `Gate In 3`. |
| `lane_in_name` | string | Tên làn vào: `Lane IN 1` – `Lane IN 6`. |
| `entry_point_out_name` | string | Tên cổng ra: `Gate Out 1`, `Gate Out 2`, `Gate Out 3`. |
| `lane_out_name` | string | Tên làn ra: `Lane OUT 1` – `Lane OUT 6`. |
| `open_mode_in` | string | Chế độ mở barrier tại vào: `AUTO` hoặc `MANUAL`. |
| `open_mode_out` | string | Chế độ mở barrier tại ra: `AUTO` hoặc `MANUAL`. |
| `check_in_date_key` | integer | Date key YYYYMMDD của ngày check-in. **Join với `dim_date.date_key`.** |
| `check_in_time_key` | string | Time key HHMM của giờ check-in. **Join với `dim_time.time_key`.** |
| `check_out_date_key` | integer | Date key YYYYMMDD của ngày check-out. Join với `dim_date.date_key`. |
| `check_out_time_key` | string | Time key HHMM của giờ check-out. Join với `dim_time.time_key`. |
| `created_at` | timestamp | Thời điểm record được tạo. |
| `last_modified_at` | timestamp | Thời điểm record được sửa lần cuối. |
| `_dbt_loaded_at` | timestamp | Thời điểm load bởi dbt. |

---

### `fct_parking_occupancy`

**Nguồn:** `fct_vehicle_events`, `dim_date`, `dim_time`, `dim_parking_lot`
**Mô tả:** Pre-aggregated mart table: occupancy theo giờ, bãi xe, loại xe. Mỗi row = một tổ hợp `(parking_lot_id, vehicle_type, occupancy_date_key, occupancy_time_key)`. **LUÔN dùng bảng này cho câu hỏi occupancy** (bao nhiêu xe đang đỗ, giờ cao điểm, tỉ lệ lấp đầy). Không tự tính occupancy từ `fct_vehicle_events`.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `parking_lot_id` | string | ID bãi xe. Join với `dim_parking_lot.pk_lot_id`. |
| `vehicle_type` | string | Loại xe: `CAR`, `MOTORBIKE`, `TRUCK`, `EV`. |
| `occupancy_hour` | timestamp | Datetime đầy đủ của slot (ví dụ: `2026-06-01 17:00:00`). |
| `occupancy_date` | string | Ngày của slot (ISO date string). |
| `occupancy_date_key` | integer | Date key YYYYMMDD. **Join với `dim_date.date_key`.** |
| `occupancy_time_key` | string | Time key HHMM (ví dụ: `'1700'`). **Join với `dim_time.time_key`.** |
| `vehicles_in` | integer | Số xe vào trong slot 1 giờ này. Range: 0–3 trong data hiện tại. |
| `vehicles_out` | integer | Số xe ra trong slot 1 giờ này. |
| `current_occupancy` | integer | **Số xe đang đỗ tích lũy tại cuối slot này** (`vehicles_in − vehicles_out` tích lũy). Range: 0–7 trong data hiện tại. Dùng cột này để trả lời "hiện có bao nhiêu xe đang đỗ". |
