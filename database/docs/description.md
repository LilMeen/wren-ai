# Table Description

Mô tả từng bảng trong schema StarRocks local fake-data. Dùng file này đối chiếu với [relationship.md](./relationship.md) khi kiểm tra join/lineage.

**Ký hiệu layer**

| Layer | Ý nghĩa |
| --- | --- |
| RAW | Dữ liệu nguồn, chưa chuẩn hóa |
| STG | Staging, chuẩn hóa tên cột / metadata |
| DIM | Dimension, mô tả thực thể |
| FCT | Fact / event chi tiết |
| MART | Aggregate mart |
| MV | Materialized view |

**Khuyến nghị Wren:** ưu tiên model `sdp_golden`, `sdp_mart`, `sdp_near_realtime` (MV). Không model relationship cho bảng RAW.

---

## Database: `sdp_raw`

### `raw_dmp_public_asset` — RAW

| | |
| --- | --- |
| **Mô tả** | Asset gốc từ DMP: id, tên, label, type, tenant/customer, profile, external id. |
| **Grain** | 1 dòng / asset |
| **Khóa chính logic** | `id` |
| **Cột join quan trọng** | `id`, `asset_profile_id`, `tenant_id`, `customer_id` |

### `raw_dmp_public_asset_profile` — RAW

| | |
| --- | --- |
| **Mô tả** | Profile asset gốc: cấu hình mặc định, rule chain, dashboard, queue. |
| **Grain** | 1 dòng / asset profile |
| **Khóa chính logic** | `id` |
| **Cột join quan trọng** | `id`, `name`, `tenant_id` |

### `raw_dmp_public_device` — RAW

| | |
| --- | --- |
| **Mô tả** | Device gốc từ DMP: id, tên, label, type, tenant/customer, firmware/software, profile, device data. |
| **Grain** | 1 dòng / device |
| **Khóa chính logic** | `id` |
| **Cột join quan trọng** | `id`, `device_profile_id`, `tenant_id`, `customer_id` |

### `raw_dmp_public_device_profile` — RAW

| | |
| --- | --- |
| **Mô tả** | Profile device gốc: transport/provision type, profile data, rule chain, dashboard, queue. |
| **Grain** | 1 dòng / device profile |
| **Khóa chính logic** | `id` |
| **Cột join quan trọng** | `id`, `name`, `type`, `tenant_id` |

### `raw_dmp_public_relation` — RAW

| | |
| --- | --- |
| **Mô tả** | Quan hệ entity DMP: from/to id, entity type, relation type. |
| **Grain** | 1 dòng / quan hệ |
| **Khóa chính logic** | `from_id`, `to_id`, `relation_type` |
| **Cột join quan trọng** | `from_id`, `from_type`, `to_id`, `to_type`, `relation_type_group`, `relation_type` |

### `raw_parking_db_vehicle_histories` — RAW

| | |
| --- | --- |
| **Mô tả** | Lịch sử xe vào/ra bãi: biển số, bãi, làn/cổng, check-in/out, phí, thanh toán, trạng thái. |
| **Grain** | 1 dòng / event xe |
| **Khóa chính logic** | `id` |
| **Cột join quan trọng** | `id`, `pk_lot_id`, `lpn`, `check_in_at`, `check_out_at` |

---

## Database: `sdp_near_realtime`

### `raw_dmp_evt_connectivity` — RAW

| | |
| --- | --- |
| **Mô tả** | Sự kiện connectivity/heartbeat: online/offline, quality score, lý do offline, timestamp. |
| **Grain** | 1 dòng / connectivity event |
| **Khóa chính logic** | `deviceId`, `tenantId`, `ts`, `tsDt` |
| **Cột join quan trọng** | `deviceId`, `tenantId`, `customerId`, `status`, `ts` |

### `raw_dmp_tlm_raw` — RAW

| | |
| --- | --- |
| **Mô tả** | Telemetry raw theo thiết bị: payload JSON, deviceType, thời gian sự kiện. |
| **Grain** | 1 dòng / telemetry event |
| **Khóa chính logic** | `deviceId`, `tenantId`, `ts`, `tsDt` |
| **Cột join quan trọng** | `deviceId`, `deviceType`, `telemetry`, `eventTime`, `tenantId` |

### `stg_mv_dmp_tlm_camera` — MV

| | |
| --- | --- |
| **Nguồn** | `sdp_near_realtime.raw_dmp_tlm_raw` (`deviceType = 'CAMERA'`) |
| **Mô tả** | Telemetry camera: CPU, memory, fan, heater, reboot, uptime. |
| **Grain** | 1 dòng / telemetry event / device |
| **Khóa chính logic** | `deviceId`, `ts` |
| **Cột join quan trọng** | `deviceId`, `tenantId`, `customerId`, `eventTime` |

### `stg_mv_dmp_tlm_chiller` — MV

| | |
| --- | --- |
| **Nguồn** | `sdp_near_realtime.raw_dmp_tlm_raw` (`deviceType = 'CHILLER'`) |
| **Mô tả** | Telemetry chiller: trạng thái, fault, mode, valve limit. |
| **Grain** | 1 dòng / telemetry event / device |
| **Khóa chính logic** | `deviceId`, `ts` |
| **Cột join quan trọng** | `deviceId`, `tenantId`, `customerId`, `eventTime` |

### `stg_mv_dmp_tlm_energy_meter` — MV

| | |
| --- | --- |
| **Nguồn** | `sdp_near_realtime.raw_dmp_tlm_raw` (`deviceType = 'ENERGY_METER'`) |
| **Mô tả** | Telemetry energy meter: dòng điện, điện năng, tần số, công suất, hệ số công suất, điện áp, nước. |
| **Grain** | 1 dòng / telemetry event / device |
| **Khóa chính logic** | `deviceId`, `ts` |
| **Cột join quan trọng** | `deviceId`, `tenantId`, `customerId`, `eventTime` |

### `stg_mv_dmp_tlm_nvr` — MV

| | |
| --- | --- |
| **Nguồn** | `sdp_near_realtime.raw_dmp_tlm_raw` (`deviceType = 'NVR'`) |
| **Mô tả** | Telemetry NVR: CPU, memory, uptime. |
| **Grain** | 1 dòng / telemetry event / device |
| **Khóa chính logic** | `deviceId`, `ts` |
| **Cột join quan trọng** | `deviceId`, `tenantId`, `customerId`, `eventTime` |

---

## Database: `sdp_staging`

### `stg_dmp_asset_profiles` — STG

| | |
| --- | --- |
| **Nguồn** | `sdp_raw.raw_dmp_public_asset_profile` |
| **Mô tả** | Asset profile đã chuẩn hóa; `id` → `asset_profile_id`. |
| **Grain** | 1 dòng / asset profile |
| **Khóa chính logic** | `asset_profile_id` |
| **Cột join quan trọng** | `asset_profile_id`, `tenant_id` |

### `stg_dmp_assets` — STG

| | |
| --- | --- |
| **Nguồn** | `sdp_raw.raw_dmp_public_asset` |
| **Mô tả** | Asset đã chuẩn hóa: id, tên, type, tenant/customer, profile. |
| **Grain** | 1 dòng / asset |
| **Khóa chính logic** | `asset_id` |
| **Cột join quan trọng** | `asset_id`, `asset_profile_id`, `tenant_id`, `customer_id` |

### `stg_dmp_device_profiles` — STG

| | |
| --- | --- |
| **Nguồn** | `sdp_raw.raw_dmp_public_device_profile` |
| **Mô tả** | Device profile đã chuẩn hóa; `id` → `device_profile_id`. |
| **Grain** | 1 dòng / device profile |
| **Khóa chính logic** | `device_profile_id` |
| **Cột join quan trọng** | `device_profile_id`, `tenant_id` |

### `stg_dmp_devices` — STG

| | |
| --- | --- |
| **Nguồn** | `sdp_raw.raw_dmp_public_device` |
| **Mô tả** | Device đã chuẩn hóa: id, tên, type, tenant/customer, profile, firmware/software. |
| **Grain** | 1 dòng / device |
| **Khóa chính logic** | `device_id` |
| **Cột join quan trọng** | `device_id`, `device_profile_id`, `tenant_id`, `customer_id` |

### `stg_dmp_device_status_events` — STG

| | |
| --- | --- |
| **Nguồn** | `sdp_near_realtime.raw_dmp_evt_connectivity` |
| **Mô tả** | Sự kiện trạng thái thiết bị: current/previous status, online flag, event date/hour. |
| **Grain** | 1 dòng / status event |
| **Khóa chính logic** | `device_id`, `event_time` |
| **Cột join quan trọng** | `device_id`, `tenant_id`, `event_time`, `is_online` |

### `stg_dmp_evt_connectivity` — STG

| | |
| --- | --- |
| **Nguồn** | `sdp_near_realtime.raw_dmp_evt_connectivity` |
| **Mô tả** | Connectivity event đã chuẩn hóa: device, tenant, trạng thái, quality score, timestamp. |
| **Grain** | 1 dòng / connectivity event |
| **Khóa chính logic** | `deviceid`, `ts` |
| **Cột join quan trọng** | `deviceid`, `tenantid`, `status`, `ts` |

> Lưu ý: cột device trong staging là `deviceid` (lowercase), khác raw `deviceId`.

### `stg_dmp_relations` — STG

| | |
| --- | --- |
| **Nguồn** | `sdp_raw.raw_dmp_public_relation` |
| **Mô tả** | Quan hệ entity DMP đã chuẩn hóa; dùng để build device ↔ asset. |
| **Grain** | 1 dòng / quan hệ |
| **Khóa chính logic** | `from_id`, `to_id`, `relation_type` |
| **Cột join quan trọng** | `from_id`, `from_type`, `to_id`, `to_type`, `relation_type` |

### `stg_vehicle_histories` — STG

| | |
| --- | --- |
| **Nguồn** | `sdp_raw.raw_parking_db_vehicle_histories` |
| **Mô tả** | Lịch sử xe đã chuẩn hóa: event id, biển số, bãi, cổng/làn, phí, trạng thái. |
| **Grain** | 1 dòng / event xe |
| **Khóa chính logic** | `event_id` |
| **Cột join quan trọng** | `event_id`, `pk_lot_id`, `lpn`, `check_in_at`, `check_out_at` |

---

## Database: `sdp_golden`

### `dim_asset` — DIM

| | |
| --- | --- |
| **Nguồn** | `sdp_staging.stg_dmp_assets`, `sdp_staging.stg_dmp_asset_profiles` |
| **Mô tả** | Dimension asset đã enrich profile: tên, type, tenant/customer, rule chain/dashboard/queue. |
| **Grain** | 1 dòng / asset |
| **Khóa chính logic** | `asset_sk`, `asset_id` |
| **Cột join quan trọng** | `asset_sk`, `asset_id`, `asset_profile_id`, `tenant_id` |

### `dim_asset_profile` — DIM

| | |
| --- | --- |
| **Nguồn** | `sdp_staging.stg_dmp_asset_profiles` |
| **Mô tả** | Dimension asset profile: mô tả profile, default flag, rule chain/dashboard/queue. |
| **Grain** | 1 dòng / asset profile |
| **Khóa chính logic** | `asset_profile_sk`, `asset_profile_id` |
| **Cột join quan trọng** | `asset_profile_sk`, `asset_profile_id` |

### `dim_date` — DIM

| | |
| --- | --- |
| **Nguồn** | Generated |
| **Mô tả** | Dimension ngày: date_key, năm/quý/tháng/tuần, weekend/weekday. |
| **Grain** | 1 dòng / ngày |
| **Khóa chính logic** | `date_key` |
| **Cột join quan trọng** | `date_key`, `full_date`, `year`, `month` |

### `dim_device` — DIM

| | |
| --- | --- |
| **Nguồn** | `sdp_staging.stg_dmp_devices`, `sdp_staging.stg_dmp_device_profiles` |
| **Mô tả** | Dimension thiết bị đã enrich profile: id, tên, type, tenant/customer, firmware/software, transport/provision. |
| **Grain** | 1 dòng / device |
| **Khóa chính logic** | `device_sk`, `device_id` |
| **Cột join quan trọng** | `device_sk`, `device_id`, `device_profile_id`, `tenant_id` |

### `dim_device_asset` — DIM (bridge)

| | |
| --- | --- |
| **Nguồn** | `dim_device`, `dim_asset`, `sdp_staging.stg_dmp_relations` |
| **Mô tả** | Bridge hiện tại giữa device và asset; flatten thông tin device + asset + profile. |
| **Grain** | 1 dòng / cặp device-asset hiện tại |
| **Khóa chính logic** | `device_sk`, `asset_sk` |
| **Cột join quan trọng** | `device_sk`, `device_id`, `asset_sk`, `asset_id` |

### `dim_device_asset_snapshot` — DIM (SCD)

| | |
| --- | --- |
| **Nguồn** | `dim_device_asset` |
| **Mô tả** | Lịch sử quan hệ device-asset (SCD): `dbt_valid_from`, `dbt_valid_to`, `dbt_scd_id`. |
| **Grain** | 1 dòng / phiên bản quan hệ device-asset |
| **Khóa chính logic** | `device_sk`, `asset_sk`, `dbt_scd_id` |
| **Cột join quan trọng** | `device_sk`, `asset_sk`, `dbt_valid_from`, `dbt_valid_to` |

### `dim_device_profile` — DIM

| | |
| --- | --- |
| **Nguồn** | `sdp_staging.stg_dmp_device_profiles` |
| **Mô tả** | Dimension device profile: transport/provision, firmware/software, profile data, rule chain/dashboard. |
| **Grain** | 1 dòng / device profile |
| **Khóa chính logic** | `device_profile_sk`, `device_profile_id` |
| **Cột join quan trọng** | `device_profile_sk`, `device_profile_id` |

### `dim_parking_lot` — DIM

| | |
| --- | --- |
| **Nguồn** | `sdp_staging.stg_vehicle_histories` |
| **Mô tả** | Dimension bãi đỗ: mã bãi, tên bãi, khu vực. |
| **Grain** | 1 dòng / bãi đỗ |
| **Khóa chính logic** | `pk_lot_id` |
| **Cột join quan trọng** | `pk_lot_id`, `pk_lot_name`, `area_id` |

### `dim_parking_lot_snapshot` — DIM (SCD)

| | |
| --- | --- |
| **Nguồn** | `dim_parking_lot` |
| **Mô tả** | Lịch sử bãi đỗ (SCD): tên bãi/khu vực theo thời gian hiệu lực. |
| **Grain** | 1 dòng / phiên bản bãi đỗ |
| **Khóa chính logic** | `pk_lot_id`, `dbt_scd_id` |
| **Cột join quan trọng** | `pk_lot_id`, `dbt_valid_from`, `dbt_valid_to` |

### `dim_time` — DIM

| | |
| --- | --- |
| **Nguồn** | Generated |
| **Mô tả** | Dimension giờ trong ngày: hour, minute, period, minutes since midnight. |
| **Grain** | 1 dòng / time slot (theo `time_grain_minutes`) |
| **Khóa chính logic** | `time_key` |
| **Cột join quan trọng** | `time_key`, `hour`, `minute`, `period` |

### `fct_device_asset_assignment` — FCT

| | |
| --- | --- |
| **Nguồn** | `dim_device`, `dim_asset`, `sdp_staging.stg_dmp_relations` |
| **Mô tả** | Fact gán thiết bị vào asset: device/asset key/id, tenant, relation type, version. |
| **Grain** | 1 dòng / assignment |
| **Khóa chính logic** | `device_sk`, `asset_sk` |
| **Cột join quan trọng** | `device_sk`, `device_id`, `asset_sk`, `asset_id`, `relation_type` |

### `fct_vehicle_events` — FCT

| | |
| --- | --- |
| **Nguồn** | `sdp_staging.stg_vehicle_histories`, `dim_date`, `dim_time`, `dim_parking_lot` |
| **Mô tả** | Fact từng lượt xe: check-in/out, bãi, loại xe, payment, phí, duration, cổng/làn, trạng thái. |
| **Grain** | 1 dòng / event xe |
| **Khóa chính logic** | `event_id` |
| **Cột join quan trọng** | `event_id`, `parking_lot_id`, `check_in_date_key`, `check_out_date_key`, `check_in_time_key`, `check_out_time_key`, `lpn` |

---

## Database: `sdp_mart`

### `fct_parking_occupancy` — MART

| | |
| --- | --- |
| **Nguồn** | `sdp_golden.fct_vehicle_events`, `dim_date`, `dim_time`, `dim_parking_lot` |
| **Mô tả** | Aggregate occupancy theo bãi, loại xe, ngày/giờ: số xe vào, số xe ra, current occupancy. |
| **Grain** | 1 dòng / bãi + loại xe + ngày + giờ |
| **Khóa chính logic** | `parking_lot_id`, `occupancy_date_key`, `occupancy_time_key`, `vehicle_type` |
| **Cột join quan trọng** | `parking_lot_id`, `occupancy_date_key`, `occupancy_time_key`, `vehicle_type` |

---

## Tóm tắt theo database

| Database | Số bảng | Vai trò |
| --- | ---: | --- |
| `sdp_raw` | 6 | Raw DMP + parking |
| `sdp_near_realtime` | 2 raw + 4 MV | Connectivity + telemetry |
| `sdp_staging` | 8 | Chuẩn hóa trước golden |
| `sdp_golden` | 12 | Semantic layer chính cho Wren |
| `sdp_mart` | 1 | Mart occupancy |
