-- Auto-generated StarRocks local/fake-data init SQL from database/docs/starrock_schema.json
-- External raw tables are converted to internal OLAP tables so local CSV Stream Load can import data.
-- Relationship section is documentation only; StarRocks does not enforce these FK mappings here.

CREATE DATABASE IF NOT EXISTS `sdp_golden`;
CREATE DATABASE IF NOT EXISTS `sdp_mart`;
CREATE DATABASE IF NOT EXISTS `sdp_near_realtime`;
CREATE DATABASE IF NOT EXISTS `sdp_raw`;
CREATE DATABASE IF NOT EXISTS `sdp_staging`;

USE `sdp_near_realtime`;

-- Source object: `default_catalog`.`sdp_near_realtime`.`raw_dmp_evt_connectivity`
CREATE TABLE IF NOT EXISTS `raw_dmp_evt_connectivity` (
  `deviceId` varchar(64) NOT NULL COMMENT "",
  `tenantId` varchar(64) NOT NULL COMMENT "",
  `ts` bigint(20) NOT NULL COMMENT "",
  `tsDt` datetime NOT NULL COMMENT "",
  `msgType` varchar(32) NULL COMMENT "",
  `customerId` varchar(64) NULL COMMENT "",
  `deviceCode` varchar(255) NULL COMMENT "",
  `status` varchar(32) NULL COMMENT "",
  `active` boolean NULL COMMENT "",
  `heartbeatLevel` varchar(16) NULL COMMENT "",
  `probeFailureReason` varchar(255) NULL COMMENT "",
  `offlineReason` varchar(255) NULL COMMENT "",
  `qualityScore` int(11) NULL COMMENT "",
  `icmpReachable` boolean NULL COMMENT ""
) ENGINE=OLAP 
PRIMARY KEY(`deviceId`, `tenantId`, `ts`, `tsDt`)
PARTITION BY date_trunc('day', `tsDt`)
DISTRIBUTED BY HASH(`deviceId`, `tenantId`) BUCKETS 4 
PROPERTIES (
"compression" = "LZ4",
"enable_persistent_index" = "true",
"fast_schema_evolution" = "true",
"replicated_storage" = "true",
"replication_num" = "1"
);

-- Source object: `default_catalog`.`sdp_near_realtime`.`raw_dmp_tlm_raw`
CREATE TABLE IF NOT EXISTS `raw_dmp_tlm_raw` (
  `deviceId` varchar(64) NOT NULL COMMENT "",
  `tenantId` varchar(64) NOT NULL COMMENT "",
  `ts` bigint(20) NOT NULL COMMENT "",
  `tsDt` datetime NOT NULL COMMENT "",
  `source` varchar(255) NULL COMMENT "",
  `customerId` varchar(64) NULL COMMENT "",
  `deviceType` varchar(64) NULL COMMENT "",
  `mqttTopic` varchar(512) NULL COMMENT "",
  `telemetry` json NULL COMMENT "",
  `eventTime` datetime NULL COMMENT ""
) ENGINE=OLAP 
PRIMARY KEY(`deviceId`, `tenantId`, `ts`, `tsDt`)
PARTITION BY date_trunc('day', `tsDt`)
DISTRIBUTED BY HASH(`deviceId`, `tenantId`) BUCKETS 4 
PROPERTIES (
"compression" = "LZ4",
"enable_persistent_index" = "true",
"fast_schema_evolution" = "true",
"replicated_storage" = "true",
"replication_num" = "1"
);

USE `sdp_raw`;

-- Source object: `sdp_dev_hive_catalog`.`sdp_raw`.`raw_dmp_public_asset`
CREATE TABLE IF NOT EXISTS `raw_dmp_public_asset` (
  `id` varchar(1048576) DEFAULT NULL,
  `created_time` bigint(20) DEFAULT NULL,
  `additional_info` varchar(1048576) DEFAULT NULL,
  `customer_id` varchar(1048576) DEFAULT NULL,
  `asset_profile_id` varchar(1048576) DEFAULT NULL,
  `name` varchar(1048576) DEFAULT NULL,
  `label` varchar(1048576) DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `type` varchar(1048576) DEFAULT NULL,
  `external_id` varchar(1048576) DEFAULT NULL,
  `version` bigint(20) DEFAULT NULL,
  `processing_day` varchar(1048576) DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`id`)
DISTRIBUTED BY HASH(`id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_hive_catalog`.`sdp_raw`.`raw_dmp_public_asset_profile`
CREATE TABLE IF NOT EXISTS `raw_dmp_public_asset_profile` (
  `id` varchar(1048576) DEFAULT NULL,
  `created_time` bigint(20) DEFAULT NULL,
  `name` varchar(1048576) DEFAULT NULL,
  `image` varchar(1048576) DEFAULT NULL,
  `description` varchar(1048576) DEFAULT NULL,
  `is_default` boolean DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `default_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `default_dashboard_id` varchar(1048576) DEFAULT NULL,
  `default_queue_name` varchar(1048576) DEFAULT NULL,
  `default_edge_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `external_id` varchar(1048576) DEFAULT NULL,
  `version` bigint(20) DEFAULT NULL,
  `processing_day` varchar(1048576) DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`id`)
DISTRIBUTED BY HASH(`id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_hive_catalog`.`sdp_raw`.`raw_dmp_public_device`
CREATE TABLE IF NOT EXISTS `raw_dmp_public_device` (
  `id` varchar(1048576) DEFAULT NULL,
  `created_time` bigint(20) DEFAULT NULL,
  `additional_info` varchar(1048576) DEFAULT NULL,
  `customer_id` varchar(1048576) DEFAULT NULL,
  `device_profile_id` varchar(1048576) DEFAULT NULL,
  `device_data` varchar(1048576) DEFAULT NULL,
  `type` varchar(1048576) DEFAULT NULL,
  `name` varchar(1048576) DEFAULT NULL,
  `label` varchar(1048576) DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `firmware_id` varchar(1048576) DEFAULT NULL,
  `software_id` varchar(1048576) DEFAULT NULL,
  `external_id` varchar(1048576) DEFAULT NULL,
  `version` bigint(20) DEFAULT NULL,
  `processing_day` varchar(1048576) DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`id`)
DISTRIBUTED BY HASH(`id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_hive_catalog`.`sdp_raw`.`raw_dmp_public_device_profile`
CREATE TABLE IF NOT EXISTS `raw_dmp_public_device_profile` (
  `id` varchar(1048576) DEFAULT NULL,
  `created_time` bigint(20) DEFAULT NULL,
  `name` varchar(1048576) DEFAULT NULL,
  `type` varchar(1048576) DEFAULT NULL,
  `image` varchar(1048576) DEFAULT NULL,
  `transport_type` varchar(1048576) DEFAULT NULL,
  `provision_type` varchar(1048576) DEFAULT NULL,
  `profile_data` varchar(1048576) DEFAULT NULL,
  `description` varchar(1048576) DEFAULT NULL,
  `is_default` boolean DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `firmware_id` varchar(1048576) DEFAULT NULL,
  `software_id` varchar(1048576) DEFAULT NULL,
  `default_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `default_dashboard_id` varchar(1048576) DEFAULT NULL,
  `default_queue_name` varchar(1048576) DEFAULT NULL,
  `provision_device_key` varchar(1048576) DEFAULT NULL,
  `default_edge_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `external_id` varchar(1048576) DEFAULT NULL,
  `version` bigint(20) DEFAULT NULL,
  `processing_day` varchar(1048576) DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`id`)
DISTRIBUTED BY HASH(`id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_hive_catalog`.`sdp_raw`.`raw_dmp_public_relation`
CREATE TABLE IF NOT EXISTS `raw_dmp_public_relation` (
  `from_id` varchar(1048576) DEFAULT NULL,
  `from_type` varchar(1048576) DEFAULT NULL,
  `to_id` varchar(1048576) DEFAULT NULL,
  `to_type` varchar(1048576) DEFAULT NULL,
  `relation_type_group` varchar(1048576) DEFAULT NULL,
  `relation_type` varchar(1048576) DEFAULT NULL,
  `additional_info` varchar(1048576) DEFAULT NULL,
  `version` bigint(20) DEFAULT NULL,
  `processing_day` varchar(1048576) DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`from_id`)
DISTRIBUTED BY HASH(`from_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_hive_catalog`.`sdp_raw`.`raw_parking_db_vehicle_histories`
CREATE TABLE IF NOT EXISTS `raw_parking_db_vehicle_histories` (
  `id` varchar(1048576) DEFAULT NULL,
  `card_number` varchar(1048576) DEFAULT NULL,
  `lpn` varchar(1048576) DEFAULT NULL,
  `lpn_cmp` varchar(1048576) DEFAULT NULL,
  `lpn_camera_in` varchar(1048576) DEFAULT NULL,
  `lpn_in_edited` varchar(1048576) DEFAULT NULL,
  `lpn_camera_out` varchar(1048576) DEFAULT NULL,
  `lpn_out_edited` varchar(1048576) DEFAULT NULL,
  `service_id` varchar(1048576) DEFAULT NULL,
  `service_name` varchar(1048576) DEFAULT NULL,
  `owner_customer_id` varchar(1048576) DEFAULT NULL,
  `org_unit_code` varchar(1048576) DEFAULT NULL,
  `org_unit_name` varchar(1048576) DEFAULT NULL,
  `pk_lot_id` varchar(1048576) DEFAULT NULL,
  `pk_lot_name` varchar(1048576) DEFAULT NULL,
  `entry_point_in_id` varchar(1048576) DEFAULT NULL,
  `entry_point_in_name` varchar(1048576) DEFAULT NULL,
  `lane_in_id` varchar(1048576) DEFAULT NULL,
  `lane_in_name` varchar(1048576) DEFAULT NULL,
  `entry_point_out_id` varchar(1048576) DEFAULT NULL,
  `entry_point_out_name` varchar(1048576) DEFAULT NULL,
  `lane_out_id` varchar(1048576) DEFAULT NULL,
  `lane_out_name` varchar(1048576) DEFAULT NULL,
  `direction_type` varchar(1048576) DEFAULT NULL,
  `check_in_at` varchar(1048576) DEFAULT NULL,
  `check_out_at` varchar(1048576) DEFAULT NULL,
  `payment_type` varchar(1048576) DEFAULT NULL,
  `use_voucher` boolean DEFAULT NULL,
  `wallet_balance_before` bigint(20) DEFAULT NULL,
  `wallet_balance_after` bigint(20) DEFAULT NULL,
  `total_topup` bigint(20) DEFAULT NULL,
  `bank_transfer` bigint(20) DEFAULT NULL,
  `parking_fee` bigint(20) DEFAULT NULL,
  `lost_card_fee` bigint(20) DEFAULT NULL,
  `promotion_amount` bigint(20) DEFAULT NULL,
  `promotion_vinfast_amount` bigint(20) DEFAULT NULL,
  `amount_due` bigint(20) DEFAULT NULL,
  `used_change` bigint(20) DEFAULT NULL,
  `open_mode_in` varchar(1048576) DEFAULT NULL,
  `open_mode_out` varchar(1048576) DEFAULT NULL,
  `check_in_lane_image_id` varchar(1048576) DEFAULT NULL,
  `check_out_lane_image_id` varchar(1048576) DEFAULT NULL,
  `history_state` varchar(1048576) DEFAULT NULL,
  `description` varchar(1048576) DEFAULT NULL,
  `area_id` varchar(1048576) DEFAULT NULL,
  `computer_inid` varchar(1048576) DEFAULT NULL,
  `computer_outid` varchar(1048576) DEFAULT NULL,
  `haunt_id` varchar(1048576) DEFAULT NULL,
  `haunt_name` varchar(1048576) DEFAULT NULL,
  `vehicle_type` varchar(1048576) DEFAULT NULL,
  `park_duration` bigint(20) DEFAULT NULL,
  `has_manual_edits` boolean DEFAULT NULL,
  `service_category` varchar(1048576) DEFAULT NULL,
  `check_in_note` varchar(1048576) DEFAULT NULL,
  `check_out_note` varchar(1048576) DEFAULT NULL,
  `is_exception` boolean DEFAULT NULL,
  `created_by_user_id` varchar(1048576) DEFAULT NULL,
  `created_by_username` varchar(1048576) DEFAULT NULL,
  `last_modified_by_user_id` varchar(1048576) DEFAULT NULL,
  `last_modified_by_username` varchar(1048576) DEFAULT NULL,
  `created_at` varchar(1048576) DEFAULT NULL,
  `last_modified_at` varchar(1048576) DEFAULT NULL,
  `face_id_in` varchar(1048576) DEFAULT NULL,
  `face_id_out` varchar(1048576) DEFAULT NULL,
  `feature_vector_in` varchar(1048576) DEFAULT NULL,
  `feature_vector_out` varchar(1048576) DEFAULT NULL,
  `checkin_customer_id` varchar(1048576) DEFAULT NULL,
  `checkout_customer_id` varchar(1048576) DEFAULT NULL,
  `processing_day` varchar(1048576) DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`id`)
DISTRIBUTED BY HASH(`id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

USE `sdp_staging`;

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_staging`.`stg_dmp_asset_profiles`
CREATE TABLE IF NOT EXISTS `stg_dmp_asset_profiles` (
  `asset_profile_id` varchar(1048576) DEFAULT NULL,
  `name` varchar(1048576) DEFAULT NULL,
  `image` varchar(1048576) DEFAULT NULL,
  `description` varchar(1048576) DEFAULT NULL,
  `is_default` boolean DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `default_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `default_dashboard_id` varchar(1048576) DEFAULT NULL,
  `default_queue_name` varchar(1048576) DEFAULT NULL,
  `default_edge_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `external_id` varchar(1048576) DEFAULT NULL,
  `version` bigint(20) DEFAULT NULL,
  `processing_day` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`asset_profile_id`)
DISTRIBUTED BY HASH(`asset_profile_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_staging`.`stg_dmp_assets`
CREATE TABLE IF NOT EXISTS `stg_dmp_assets` (
  `asset_id` varchar(1048576) DEFAULT NULL,
  `additional_info` varchar(1048576) DEFAULT NULL,
  `customer_id` varchar(1048576) DEFAULT NULL,
  `asset_profile_id` varchar(1048576) DEFAULT NULL,
  `name` varchar(1048576) DEFAULT NULL,
  `label` varchar(1048576) DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `type` varchar(1048576) DEFAULT NULL,
  `external_id` varchar(1048576) DEFAULT NULL,
  `version` bigint(20) DEFAULT NULL,
  `processing_day` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`asset_id`)
DISTRIBUTED BY HASH(`asset_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_staging`.`stg_dmp_device_profiles`
CREATE TABLE IF NOT EXISTS `stg_dmp_device_profiles` (
  `device_profile_id` varchar(1048576) DEFAULT NULL,
  `name` varchar(1048576) DEFAULT NULL,
  `type` varchar(1048576) DEFAULT NULL,
  `image` varchar(1048576) DEFAULT NULL,
  `transport_type` varchar(1048576) DEFAULT NULL,
  `provision_type` varchar(1048576) DEFAULT NULL,
  `profile_data` varchar(1048576) DEFAULT NULL,
  `description` varchar(1048576) DEFAULT NULL,
  `is_default` boolean DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `firmware_id` varchar(1048576) DEFAULT NULL,
  `software_id` varchar(1048576) DEFAULT NULL,
  `default_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `default_dashboard_id` varchar(1048576) DEFAULT NULL,
  `default_queue_name` varchar(1048576) DEFAULT NULL,
  `provision_device_key` varchar(1048576) DEFAULT NULL,
  `default_edge_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `external_id` varchar(1048576) DEFAULT NULL,
  `version` bigint(20) DEFAULT NULL,
  `processing_day` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`device_profile_id`)
DISTRIBUTED BY HASH(`device_profile_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_staging`.`stg_dmp_device_status_events`
CREATE TABLE IF NOT EXISTS `stg_dmp_device_status_events` (
  `event_id` varchar(1048576) DEFAULT NULL,
  `device_id` varchar(1048576) DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `event_type` varchar(1048576) DEFAULT NULL,
  `source_system` varchar(1048576) DEFAULT NULL,
  `device_code` varchar(1048576) DEFAULT NULL,
  `device_type` varchar(1048576) DEFAULT NULL,
  `ip_address` varchar(1048576) DEFAULT NULL,
  `current_status` varchar(1048576) DEFAULT NULL,
  `previous_status` varchar(1048576) DEFAULT NULL,
  `status_change_reason` varchar(1048576) DEFAULT NULL,
  `event_time` datetime DEFAULT NULL,
  `event_date` date DEFAULT NULL,
  `event_hour` datetime DEFAULT NULL,
  `processing_day` date DEFAULT NULL,
  `is_online` boolean DEFAULT NULL,
  `is_status_change_event` boolean DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`event_id`)
DISTRIBUTED BY HASH(`event_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_staging`.`stg_dmp_devices`
CREATE TABLE IF NOT EXISTS `stg_dmp_devices` (
  `device_id` varchar(1048576) DEFAULT NULL,
  `additional_info` varchar(1048576) DEFAULT NULL,
  `customer_id` varchar(1048576) DEFAULT NULL,
  `device_profile_id` varchar(1048576) DEFAULT NULL,
  `device_data` varchar(1048576) DEFAULT NULL,
  `type` varchar(1048576) DEFAULT NULL,
  `name` varchar(1048576) DEFAULT NULL,
  `label` varchar(1048576) DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `firmware_id` varchar(1048576) DEFAULT NULL,
  `software_id` varchar(1048576) DEFAULT NULL,
  `external_id` varchar(1048576) DEFAULT NULL,
  `version` bigint(20) DEFAULT NULL,
  `processing_day` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`device_id`)
DISTRIBUTED BY HASH(`device_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_staging`.`stg_dmp_evt_connectivity`
CREATE TABLE IF NOT EXISTS `stg_dmp_evt_connectivity` (
  `msgtype` varchar(1048576) DEFAULT NULL,
  `deviceid` varchar(1048576) DEFAULT NULL,
  `tenantid` varchar(1048576) DEFAULT NULL,
  `customerid` varchar(1048576) DEFAULT NULL,
  `devicecode` varchar(1048576) DEFAULT NULL,
  `status` varchar(1048576) DEFAULT NULL,
  `offlinereason` varchar(1048576) DEFAULT NULL,
  `qualityscore` int(11) DEFAULT NULL,
  `icmpreachable` varchar(1048576) DEFAULT NULL,
  `ts` bigint(20) DEFAULT NULL,
  `processing_day` varchar(1048576) DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`msgtype`)
DISTRIBUTED BY HASH(`msgtype`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_staging`.`stg_dmp_relations`
CREATE TABLE IF NOT EXISTS `stg_dmp_relations` (
  `from_id` varchar(1048576) DEFAULT NULL,
  `from_type` varchar(1048576) DEFAULT NULL,
  `to_id` varchar(1048576) DEFAULT NULL,
  `to_type` varchar(1048576) DEFAULT NULL,
  `relation_type_group` varchar(1048576) DEFAULT NULL,
  `relation_type` varchar(1048576) DEFAULT NULL,
  `additional_info` varchar(1048576) DEFAULT NULL,
  `version` bigint(20) DEFAULT NULL,
  `processing_day` date DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`from_id`)
DISTRIBUTED BY HASH(`from_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_staging`.`stg_vehicle_histories`
CREATE TABLE IF NOT EXISTS `stg_vehicle_histories` (
  `event_id` varchar(1048576) DEFAULT NULL,
  `card_number` varchar(1048576) DEFAULT NULL,
  `lpn` varchar(1048576) DEFAULT NULL,
  `lpn_cmp` varchar(1048576) DEFAULT NULL,
  `lpn_camera_in` varchar(1048576) DEFAULT NULL,
  `lpn_in_edited` varchar(1048576) DEFAULT NULL,
  `lpn_camera_out` varchar(1048576) DEFAULT NULL,
  `lpn_out_edited` varchar(1048576) DEFAULT NULL,
  `service_id` varchar(1048576) DEFAULT NULL,
  `service_name` varchar(1048576) DEFAULT NULL,
  `owner_customer_id` varchar(1048576) DEFAULT NULL,
  `org_unit_code` varchar(1048576) DEFAULT NULL,
  `org_unit_name` varchar(1048576) DEFAULT NULL,
  `pk_lot_id` varchar(1048576) DEFAULT NULL,
  `pk_lot_name` varchar(1048576) DEFAULT NULL,
  `entry_point_in_id` varchar(1048576) DEFAULT NULL,
  `entry_point_in_name` varchar(1048576) DEFAULT NULL,
  `lane_in_id` varchar(1048576) DEFAULT NULL,
  `lane_in_name` varchar(1048576) DEFAULT NULL,
  `entry_point_out_id` varchar(1048576) DEFAULT NULL,
  `entry_point_out_name` varchar(1048576) DEFAULT NULL,
  `lane_out_id` varchar(1048576) DEFAULT NULL,
  `lane_out_name` varchar(1048576) DEFAULT NULL,
  `direction_type` varchar(1048576) DEFAULT NULL,
  `check_in_at_raw` varchar(1048576) DEFAULT NULL,
  `check_out_at_raw` varchar(1048576) DEFAULT NULL,
  `check_in_at` datetime DEFAULT NULL,
  `check_out_at` datetime DEFAULT NULL,
  `payment_type` varchar(1048576) DEFAULT NULL,
  `use_voucher` varchar(1048576) DEFAULT NULL,
  `wallet_balance_before_raw` varchar(1048576) DEFAULT NULL,
  `wallet_balance_after_raw` varchar(1048576) DEFAULT NULL,
  `total_topup_raw` varchar(1048576) DEFAULT NULL,
  `bank_transfer_raw` varchar(1048576) DEFAULT NULL,
  `parking_fee_raw` varchar(1048576) DEFAULT NULL,
  `lost_card_fee_raw` varchar(1048576) DEFAULT NULL,
  `promotion_amount_raw` varchar(1048576) DEFAULT NULL,
  `promotion_vinfast_amount_raw` varchar(1048576) DEFAULT NULL,
  `amount_due_raw` varchar(1048576) DEFAULT NULL,
  `used_change_raw` varchar(1048576) DEFAULT NULL,
  `open_mode_in` varchar(1048576) DEFAULT NULL,
  `open_mode_out` varchar(1048576) DEFAULT NULL,
  `check_in_lane_image_id` varchar(1048576) DEFAULT NULL,
  `check_out_lane_image_id` varchar(1048576) DEFAULT NULL,
  `history_state` varchar(1048576) DEFAULT NULL,
  `description` varchar(1048576) DEFAULT NULL,
  `area_id` varchar(1048576) DEFAULT NULL,
  `computer_inid` varchar(1048576) DEFAULT NULL,
  `computer_outid` varchar(1048576) DEFAULT NULL,
  `haunt_id` varchar(1048576) DEFAULT NULL,
  `haunt_name` varchar(1048576) DEFAULT NULL,
  `vehicle_type` varchar(1048576) DEFAULT NULL,
  `park_duration_ms` bigint(20) DEFAULT NULL,
  `has_manual_edits` varchar(1048576) DEFAULT NULL,
  `service_category` varchar(1048576) DEFAULT NULL,
  `check_in_note` varchar(1048576) DEFAULT NULL,
  `check_out_note` varchar(1048576) DEFAULT NULL,
  `is_exception` varchar(1048576) DEFAULT NULL,
  `created_by_user_id` varchar(1048576) DEFAULT NULL,
  `created_by_username` varchar(1048576) DEFAULT NULL,
  `last_modified_by_user_id` varchar(1048576) DEFAULT NULL,
  `last_modified_by_username` varchar(1048576) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `last_modified_at` datetime DEFAULT NULL,
  `face_id_in` varchar(1048576) DEFAULT NULL,
  `face_id_out` varchar(1048576) DEFAULT NULL,
  `feature_vector_in` varchar(1048576) DEFAULT NULL,
  `feature_vector_out` varchar(1048576) DEFAULT NULL,
  `checkin_customer_id` varchar(1048576) DEFAULT NULL,
  `checkout_customer_id` varchar(1048576) DEFAULT NULL,
  `event_date` date DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`event_id`)
DISTRIBUTED BY HASH(`event_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

USE `sdp_golden`;

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`dim_asset`
CREATE TABLE IF NOT EXISTS `dim_asset` (
  `asset_sk` varchar(1048576) DEFAULT NULL,
  `asset_id` varchar(1048576) DEFAULT NULL,
  `asset_name` varchar(1048576) DEFAULT NULL,
  `asset_label` varchar(1048576) DEFAULT NULL,
  `asset_type` varchar(1048576) DEFAULT NULL,
  `additional_info` varchar(1048576) DEFAULT NULL,
  `customer_id` varchar(1048576) DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `external_id` varchar(1048576) DEFAULT NULL,
  `asset_profile_id` varchar(1048576) DEFAULT NULL,
  `asset_profile_name` varchar(1048576) DEFAULT NULL,
  `asset_profile_description` varchar(1048576) DEFAULT NULL,
  `asset_profile_is_default` boolean DEFAULT NULL,
  `default_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `default_dashboard_id` varchar(1048576) DEFAULT NULL,
  `default_queue_name` varchar(1048576) DEFAULT NULL,
  `default_edge_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`asset_sk`)
DISTRIBUTED BY HASH(`asset_sk`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`dim_asset_profile`
CREATE TABLE IF NOT EXISTS `dim_asset_profile` (
  `asset_profile_sk` varchar(1048576) DEFAULT NULL,
  `asset_profile_id` varchar(1048576) DEFAULT NULL,
  `asset_profile_name` varchar(1048576) DEFAULT NULL,
  `asset_profile_description` varchar(1048576) DEFAULT NULL,
  `is_default` boolean DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `default_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `default_dashboard_id` varchar(1048576) DEFAULT NULL,
  `default_queue_name` varchar(1048576) DEFAULT NULL,
  `default_edge_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `image` varchar(1048576) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`asset_profile_sk`)
DISTRIBUTED BY HASH(`asset_profile_sk`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`dim_date`
CREATE TABLE IF NOT EXISTS `dim_date` (
  `date_key` int(11) DEFAULT NULL,
  `full_date` date DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `quarter` int(11) DEFAULT NULL,
  `month` int(11) DEFAULT NULL,
  `day` int(11) DEFAULT NULL,
  `year_month` varchar(1048576) DEFAULT NULL,
  `year_week` varchar(1048576) DEFAULT NULL,
  `day_of_year` int(11) DEFAULT NULL,
  `day_of_week` int(11) DEFAULT NULL,
  `day_name` varchar(1048576) DEFAULT NULL,
  `day_name_short` varchar(1048576) DEFAULT NULL,
  `is_weekend` boolean DEFAULT NULL,
  `month_name` varchar(1048576) DEFAULT NULL,
  `month_name_short` varchar(1048576) DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`date_key`)
DISTRIBUTED BY HASH(`date_key`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`dim_device`
CREATE TABLE IF NOT EXISTS `dim_device` (
  `device_sk` varchar(1048576) DEFAULT NULL,
  `device_id` varchar(1048576) DEFAULT NULL,
  `device_name` varchar(1048576) DEFAULT NULL,
  `device_label` varchar(1048576) DEFAULT NULL,
  `device_type` varchar(1048576) DEFAULT NULL,
  `additional_info` varchar(1048576) DEFAULT NULL,
  `device_data` varchar(1048576) DEFAULT NULL,
  `customer_id` varchar(1048576) DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `firmware_id` varchar(1048576) DEFAULT NULL,
  `software_id` varchar(1048576) DEFAULT NULL,
  `external_id` varchar(1048576) DEFAULT NULL,
  `device_profile_id` varchar(1048576) DEFAULT NULL,
  `device_profile_name` varchar(1048576) DEFAULT NULL,
  `device_profile_description` varchar(1048576) DEFAULT NULL,
  `transport_type` varchar(1048576) DEFAULT NULL,
  `provision_type` varchar(1048576) DEFAULT NULL,
  `device_profile_is_default` boolean DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`device_sk`)
DISTRIBUTED BY HASH(`device_sk`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`dim_device_asset`
CREATE TABLE IF NOT EXISTS `dim_device_asset` (
  `device_sk` varchar(1048576) DEFAULT NULL,
  `asset_sk` varchar(1048576) DEFAULT NULL,
  `device_id` varchar(1048576) DEFAULT NULL,
  `device_name` varchar(1048576) DEFAULT NULL,
  `device_label` varchar(1048576) DEFAULT NULL,
  `device_type` varchar(1048576) DEFAULT NULL,
  `device_additional_info` varchar(1048576) DEFAULT NULL,
  `device_data` varchar(1048576) DEFAULT NULL,
  `device_customer_id` varchar(1048576) DEFAULT NULL,
  `device_tenant_id` varchar(1048576) DEFAULT NULL,
  `firmware_id` varchar(1048576) DEFAULT NULL,
  `software_id` varchar(1048576) DEFAULT NULL,
  `device_external_id` varchar(1048576) DEFAULT NULL,
  `device_profile_name` varchar(1048576) DEFAULT NULL,
  `device_profile_description` varchar(1048576) DEFAULT NULL,
  `transport_type` varchar(1048576) DEFAULT NULL,
  `provision_type` varchar(1048576) DEFAULT NULL,
  `device_profile_is_default` boolean DEFAULT NULL,
  `device_created_at` datetime DEFAULT NULL,
  `asset_id` varchar(1048576) DEFAULT NULL,
  `asset_name` varchar(1048576) DEFAULT NULL,
  `asset_label` varchar(1048576) DEFAULT NULL,
  `asset_type` varchar(1048576) DEFAULT NULL,
  `asset_additional_info` varchar(1048576) DEFAULT NULL,
  `asset_customer_id` varchar(1048576) DEFAULT NULL,
  `asset_tenant_id` varchar(1048576) DEFAULT NULL,
  `asset_external_id` varchar(1048576) DEFAULT NULL,
  `asset_profile_name` varchar(1048576) DEFAULT NULL,
  `asset_profile_description` varchar(1048576) DEFAULT NULL,
  `asset_profile_is_default` boolean DEFAULT NULL,
  `default_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `default_dashboard_id` varchar(1048576) DEFAULT NULL,
  `default_queue_name` varchar(1048576) DEFAULT NULL,
  `default_edge_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `asset_created_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`device_sk`)
DISTRIBUTED BY HASH(`device_sk`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`dim_device_asset_snapshot`
CREATE TABLE IF NOT EXISTS `dim_device_asset_snapshot` (
  `device_asset_sk` varchar(1048576) DEFAULT NULL,
  `device_sk` varchar(1048576) DEFAULT NULL,
  `asset_sk` varchar(1048576) DEFAULT NULL,
  `device_id` varchar(1048576) DEFAULT NULL,
  `device_name` varchar(1048576) DEFAULT NULL,
  `device_label` varchar(1048576) DEFAULT NULL,
  `device_type` varchar(1048576) DEFAULT NULL,
  `device_additional_info` varchar(1048576) DEFAULT NULL,
  `device_data` varchar(1048576) DEFAULT NULL,
  `device_customer_id` varchar(1048576) DEFAULT NULL,
  `device_tenant_id` varchar(1048576) DEFAULT NULL,
  `firmware_id` varchar(1048576) DEFAULT NULL,
  `software_id` varchar(1048576) DEFAULT NULL,
  `device_external_id` varchar(1048576) DEFAULT NULL,
  `device_profile_name` varchar(1048576) DEFAULT NULL,
  `device_profile_description` varchar(1048576) DEFAULT NULL,
  `transport_type` varchar(1048576) DEFAULT NULL,
  `provision_type` varchar(1048576) DEFAULT NULL,
  `device_profile_is_default` boolean DEFAULT NULL,
  `device_created_at` datetime DEFAULT NULL,
  `asset_id` varchar(1048576) DEFAULT NULL,
  `asset_name` varchar(1048576) DEFAULT NULL,
  `asset_label` varchar(1048576) DEFAULT NULL,
  `asset_type` varchar(1048576) DEFAULT NULL,
  `asset_additional_info` varchar(1048576) DEFAULT NULL,
  `asset_customer_id` varchar(1048576) DEFAULT NULL,
  `asset_tenant_id` varchar(1048576) DEFAULT NULL,
  `asset_external_id` varchar(1048576) DEFAULT NULL,
  `asset_profile_name` varchar(1048576) DEFAULT NULL,
  `asset_profile_description` varchar(1048576) DEFAULT NULL,
  `asset_profile_is_default` boolean DEFAULT NULL,
  `default_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `default_dashboard_id` varchar(1048576) DEFAULT NULL,
  `default_queue_name` varchar(1048576) DEFAULT NULL,
  `default_edge_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `asset_created_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL,
  `dbt_scd_id` varchar(1048576) DEFAULT NULL,
  `dbt_updated_at` datetime DEFAULT NULL,
  `dbt_valid_from` datetime DEFAULT NULL,
  `dbt_valid_to` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`device_asset_sk`)
DISTRIBUTED BY HASH(`device_asset_sk`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`dim_device_profile`
CREATE TABLE IF NOT EXISTS `dim_device_profile` (
  `device_profile_sk` varchar(1048576) DEFAULT NULL,
  `device_profile_id` varchar(1048576) DEFAULT NULL,
  `device_profile_name` varchar(1048576) DEFAULT NULL,
  `profile_type` varchar(1048576) DEFAULT NULL,
  `transport_type` varchar(1048576) DEFAULT NULL,
  `provision_type` varchar(1048576) DEFAULT NULL,
  `profile_data` varchar(1048576) DEFAULT NULL,
  `device_profile_description` varchar(1048576) DEFAULT NULL,
  `is_default` boolean DEFAULT NULL,
  `tenant_id` varchar(1048576) DEFAULT NULL,
  `firmware_id` varchar(1048576) DEFAULT NULL,
  `software_id` varchar(1048576) DEFAULT NULL,
  `default_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `default_dashboard_id` varchar(1048576) DEFAULT NULL,
  `default_queue_name` varchar(1048576) DEFAULT NULL,
  `default_edge_rule_chain_id` varchar(1048576) DEFAULT NULL,
  `provision_device_key` varchar(1048576) DEFAULT NULL,
  `image` varchar(1048576) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`device_profile_sk`)
DISTRIBUTED BY HASH(`device_profile_sk`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`dim_parking_lot`
CREATE TABLE IF NOT EXISTS `dim_parking_lot` (
  `pk_lot_id` varchar(1048576) DEFAULT NULL,
  `pk_lot_name` varchar(1048576) DEFAULT NULL,
  `area_id` varchar(1048576) DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`pk_lot_id`)
DISTRIBUTED BY HASH(`pk_lot_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`dim_parking_lot_snapshot`
CREATE TABLE IF NOT EXISTS `dim_parking_lot_snapshot` (
  `pk_lot_id` varchar(1048576) DEFAULT NULL,
  `pk_lot_name` varchar(1048576) DEFAULT NULL,
  `area_id` varchar(1048576) DEFAULT NULL,
  `dbt_scd_id` varchar(1048576) DEFAULT NULL,
  `dbt_updated_at` datetime DEFAULT NULL,
  `dbt_valid_from` datetime DEFAULT NULL,
  `dbt_valid_to` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`pk_lot_id`)
DISTRIBUTED BY HASH(`pk_lot_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`dim_time`
CREATE TABLE IF NOT EXISTS `dim_time` (
  `time_key` varchar(4) DEFAULT NULL,
  `time_of_day` varchar(8) DEFAULT NULL,
  `hour` int(11) DEFAULT NULL,
  `minute` int(11) DEFAULT NULL,
  `time_label` varchar(1048576) DEFAULT NULL,
  `hour_label` varchar(1048576) DEFAULT NULL,
  `period` varchar(1048576) DEFAULT NULL,
  `time_of_day_label` varchar(1048576) DEFAULT NULL,
  `minutes_since_midnight` int(11) DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`time_key`)
DISTRIBUTED BY HASH(`time_key`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`fct_device_asset_assignment`
CREATE TABLE IF NOT EXISTS `fct_device_asset_assignment` (
  `device_sk` varchar(1048576) DEFAULT NULL,
  `asset_sk` varchar(1048576) DEFAULT NULL,
  `device_id` varchar(1048576) DEFAULT NULL,
  `device_tenant_id` varchar(1048576) DEFAULT NULL,
  `asset_id` varchar(1048576) DEFAULT NULL,
  `asset_tenant_id` varchar(1048576) DEFAULT NULL,
  `relation_type_group` varchar(1048576) DEFAULT NULL,
  `relation_type` varchar(1048576) DEFAULT NULL,
  `relation_additional_info` varchar(1048576) DEFAULT NULL,
  `relation_version` bigint(20) DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`device_sk`)
DISTRIBUTED BY HASH(`device_sk`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_golden`.`fct_vehicle_events`
CREATE TABLE IF NOT EXISTS `fct_vehicle_events` (
  `event_id` varchar(1048576) DEFAULT NULL,
  `check_in_at` datetime DEFAULT NULL,
  `check_out_at` datetime DEFAULT NULL,
  `event_date` date DEFAULT NULL,
  `check_in_timestamp` datetime DEFAULT NULL,
  `check_out_timestamp` datetime DEFAULT NULL,
  `parking_lot_id` varchar(1048576) DEFAULT NULL,
  `vehicle_type` varchar(1048576) DEFAULT NULL,
  `direction_type` varchar(1048576) DEFAULT NULL,
  `history_state` varchar(1048576) DEFAULT NULL,
  `payment_type` varchar(1048576) DEFAULT NULL,
  `lpn` varchar(1048576) DEFAULT NULL,
  `lpn_cmp` varchar(1048576) DEFAULT NULL,
  `service_id` varchar(1048576) DEFAULT NULL,
  `service_name` varchar(1048576) DEFAULT NULL,
  `service_category` varchar(1048576) DEFAULT NULL,
  `owner_customer_id` varchar(1048576) DEFAULT NULL,
  `card_number` varchar(1048576) DEFAULT NULL,
  `use_voucher` varchar(1048576) DEFAULT NULL,
  `wallet_balance_before` double DEFAULT NULL,
  `wallet_balance_after` double DEFAULT NULL,
  `total_topup` double DEFAULT NULL,
  `bank_transfer` double DEFAULT NULL,
  `parking_fee` double DEFAULT NULL,
  `lost_card_fee` double DEFAULT NULL,
  `promotion_amount` double DEFAULT NULL,
  `promotion_vinfast_amount` double DEFAULT NULL,
  `amount_due` double DEFAULT NULL,
  `used_change` double DEFAULT NULL,
  `park_duration_ms` bigint(20) DEFAULT NULL,
  `org_unit_code` varchar(1048576) DEFAULT NULL,
  `org_unit_name` varchar(1048576) DEFAULT NULL,
  `checkin_customer_id` varchar(1048576) DEFAULT NULL,
  `checkout_customer_id` varchar(1048576) DEFAULT NULL,
  `entry_point_in_name` varchar(1048576) DEFAULT NULL,
  `lane_in_name` varchar(1048576) DEFAULT NULL,
  `entry_point_out_name` varchar(1048576) DEFAULT NULL,
  `lane_out_name` varchar(1048576) DEFAULT NULL,
  `open_mode_in` varchar(1048576) DEFAULT NULL,
  `open_mode_out` varchar(1048576) DEFAULT NULL,
  `check_in_date_key` int(11) DEFAULT NULL,
  `check_in_time_key` varchar(4) DEFAULT NULL,
  `check_out_date_key` int(11) DEFAULT NULL,
  `check_out_time_key` varchar(4) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `last_modified_at` datetime DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`event_id`)
DISTRIBUTED BY HASH(`event_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

USE `sdp_mart`;

-- Source object: `sdp_dev_iceberg_catalog`.`sdp_mart`.`fct_parking_occupancy`
CREATE TABLE IF NOT EXISTS `fct_parking_occupancy` (
  `parking_lot_id` varchar(1048576) DEFAULT NULL,
  `vehicle_type` varchar(1048576) DEFAULT NULL,
  `occupancy_hour` datetime DEFAULT NULL,
  `occupancy_date` date DEFAULT NULL,
  `occupancy_date_key` int(11) DEFAULT NULL,
  `occupancy_time_key` varchar(4) DEFAULT NULL,
  `vehicles_in` bigint(20) DEFAULT NULL,
  `vehicles_out` bigint(20) DEFAULT NULL,
  `current_occupancy` bigint(20) DEFAULT NULL,
  `_dbt_loaded_at` datetime DEFAULT NULL
)
ENGINE=OLAP
DUPLICATE KEY(`parking_lot_id`)
DISTRIBUTED BY HASH(`parking_lot_id`) BUCKETS 4
PROPERTIES ("replication_num" = "1");

USE `sdp_near_realtime`;

-- Source object: `default_catalog`.`sdp_near_realtime`.`stg_mv_dmp_tlm_camera`
CREATE MATERIALIZED VIEW IF NOT EXISTS `stg_mv_dmp_tlm_camera` (`deviceId`, `ts`, `eventTime`, `tenantId`, `customerId`, `cpu_usage_pct`, `memory_free_mb`, `memory_used_mb`, `fan_state`, `heater_state`, `reboot_count_total`, `uptime_seconds`, `tsDt`)
DISTRIBUTED BY HASH(`deviceId`) BUCKETS 4 
REFRESH ASYNC
PROPERTIES (
"replicated_storage" = "true",
"replication_num" = "1",
"storage_medium" = "HDD"
)
AS SELECT `raw_dmp_tlm_raw`.`deviceId`, `raw_dmp_tlm_raw`.`ts`, `raw_dmp_tlm_raw`.`eventTime`, `raw_dmp_tlm_raw`.`tenantId`, `raw_dmp_tlm_raw`.`customerId`, get_json_int(`raw_dmp_tlm_raw`.`telemetry`, '$.cpu_usage_pct') AS `cpu_usage_pct`, get_json_int(`raw_dmp_tlm_raw`.`telemetry`, '$.memory_free_mb') AS `memory_free_mb`, get_json_int(`raw_dmp_tlm_raw`.`telemetry`, '$.memory_used_mb') AS `memory_used_mb`, get_json_bool(`raw_dmp_tlm_raw`.`telemetry`, '$.fan_state') AS `fan_state`, get_json_bool(`raw_dmp_tlm_raw`.`telemetry`, '$.heater_state') AS `heater_state`, get_json_int(`raw_dmp_tlm_raw`.`telemetry`, '$.reboot_count_total') AS `reboot_count_total`, get_json_int(`raw_dmp_tlm_raw`.`telemetry`, '$.uptime_seconds') AS `uptime_seconds`, `raw_dmp_tlm_raw`.`tsDt`
FROM `sdp_near_realtime`.`raw_dmp_tlm_raw`
WHERE `raw_dmp_tlm_raw`.`deviceType` = 'CAMERA';

-- Source object: `default_catalog`.`sdp_near_realtime`.`stg_mv_dmp_tlm_chiller`
CREATE MATERIALIZED VIEW IF NOT EXISTS `stg_mv_dmp_tlm_chiller` (`deviceId`, `ts`, `eventTime`, `tenantId`, `customerId`, `chiller_state`, `fault`, `mode`, `return_valve_open_limit`, `supply_valve_open_limit`, `supply_valve_close_limit`, `tsDt`)
DISTRIBUTED BY HASH(`deviceId`) BUCKETS 4 
REFRESH ASYNC
PROPERTIES (
"replicated_storage" = "true",
"replication_num" = "1",
"storage_medium" = "HDD"
)
AS SELECT `raw_dmp_tlm_raw`.`deviceId`, `raw_dmp_tlm_raw`.`ts`, `raw_dmp_tlm_raw`.`eventTime`, `raw_dmp_tlm_raw`.`tenantId`, `raw_dmp_tlm_raw`.`customerId`, get_json_bool(`raw_dmp_tlm_raw`.`telemetry`, '$.chiller_state') AS `chiller_state`, get_json_bool(`raw_dmp_tlm_raw`.`telemetry`, '$.fault') AS `fault`, get_json_bool(`raw_dmp_tlm_raw`.`telemetry`, '$.mode') AS `mode`, get_json_bool(`raw_dmp_tlm_raw`.`telemetry`, '$.return_valve_open_limit') AS `return_valve_open_limit`, get_json_bool(`raw_dmp_tlm_raw`.`telemetry`, '$.supply_valve_open_limit') AS `supply_valve_open_limit`, get_json_bool(`raw_dmp_tlm_raw`.`telemetry`, '$.supply_valve_close_limit') AS `supply_valve_close_limit`, `raw_dmp_tlm_raw`.`tsDt`
FROM `sdp_near_realtime`.`raw_dmp_tlm_raw`
WHERE `raw_dmp_tlm_raw`.`deviceType` = 'siemens-chiller';

-- Source object: `default_catalog`.`sdp_near_realtime`.`stg_mv_dmp_tlm_energy_meter`
CREATE MATERIALIZED VIEW IF NOT EXISTS `stg_mv_dmp_tlm_energy_meter` (`deviceId`, `ts`, `eventTime`, `tenantId`, `customerId`, `current_a`, `energy_active_kwh_total`, `energy_reactive_kvarh_total`, `frequency_hz`, `power_active_kw`, `power_factor`, `voltage_l1_v`, `voltage_l2_v`, `voltage_l3_v`, `water_volume_m3_total`, `tsDt`)
DISTRIBUTED BY HASH(`deviceId`) BUCKETS 4 
REFRESH ASYNC
PROPERTIES (
"replicated_storage" = "true",
"replication_num" = "1",
"storage_medium" = "HDD"
)
AS SELECT `raw_dmp_tlm_raw`.`deviceId`, `raw_dmp_tlm_raw`.`ts`, `raw_dmp_tlm_raw`.`eventTime`, `raw_dmp_tlm_raw`.`tenantId`, `raw_dmp_tlm_raw`.`customerId`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.current_a') AS `current_a`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.energy_active_kwh_total') AS `energy_active_kwh_total`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.energy_reactive_kvarh_total') AS `energy_reactive_kvarh_total`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.frequency_hz') AS `frequency_hz`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.power_active_kw') AS `power_active_kw`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.power_factor') AS `power_factor`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.voltage_l1_v') AS `voltage_l1_v`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.voltage_l2_v') AS `voltage_l2_v`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.voltage_l3_v') AS `voltage_l3_v`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.water_volume_m3_total') AS `water_volume_m3_total`, `raw_dmp_tlm_raw`.`tsDt`
FROM `sdp_near_realtime`.`raw_dmp_tlm_raw`
WHERE `raw_dmp_tlm_raw`.`deviceType` = 'siemens-energy-meter';

-- Source object: `default_catalog`.`sdp_near_realtime`.`stg_mv_dmp_tlm_nvr`
CREATE MATERIALIZED VIEW IF NOT EXISTS `stg_mv_dmp_tlm_nvr` (`deviceId`, `ts`, `eventTime`, `tenantId`, `customerId`, `cpu_usage_pct`, `memory_free_mb`, `memory_used_mb`, `uptime_seconds`, `tsDt`)
DISTRIBUTED BY HASH(`deviceId`) BUCKETS 4 
REFRESH ASYNC
PROPERTIES (
"replicated_storage" = "true",
"replication_num" = "1",
"storage_medium" = "HDD"
)
AS SELECT `raw_dmp_tlm_raw`.`deviceId`, `raw_dmp_tlm_raw`.`ts`, `raw_dmp_tlm_raw`.`eventTime`, `raw_dmp_tlm_raw`.`tenantId`, `raw_dmp_tlm_raw`.`customerId`, get_json_int(`raw_dmp_tlm_raw`.`telemetry`, '$.cpu_usage_pct') AS `cpu_usage_pct`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.memory_free_mb') AS `memory_free_mb`, get_json_double(`raw_dmp_tlm_raw`.`telemetry`, '$.memory_used_mb') AS `memory_used_mb`, get_json_int(`raw_dmp_tlm_raw`.`telemetry`, '$.uptime_seconds') AS `uptime_seconds`, `raw_dmp_tlm_raw`.`tsDt`
FROM `sdp_near_realtime`.`raw_dmp_tlm_raw`
WHERE `raw_dmp_tlm_raw`.`deviceType` = 'NVR';

-- -----------------------------------------------------------------------------
-- Relationships for semantic/LLM layer (not raw tables; documentation only)
-- -----------------------------------------------------------------------------
-- `stg_dmp_asset_profiles`
--   - Lineage: `asset_profile_id` maps to `raw_dmp_public_asset_profile`.`id`.
--   - Used by `stg_dmp_assets`.`asset_profile_id` and `dim_asset` profile attributes.
-- `stg_dmp_assets`
--   - Lineage: `asset_id` maps to `raw_dmp_public_asset`.`id`.
--   - Profile lookup: `asset_profile_id` -> `stg_dmp_asset_profiles`.`asset_profile_id`.
--   - Golden lookup: `asset_id` -> `dim_asset`.`asset_id`.
-- `stg_dmp_device_profiles`
--   - Lineage: `device_profile_id` maps to `raw_dmp_public_device_profile`.`id`.
--   - Used by `stg_dmp_devices`.`device_profile_id` and `dim_device` profile attributes.
-- `stg_dmp_device_status_events`
--   - Device lookup: `device_id` -> `dim_device`.`device_id`.
-- `stg_dmp_devices`
--   - Lineage: `device_id` maps to `raw_dmp_public_device`.`id`.
--   - Profile lookup: `device_profile_id` -> `stg_dmp_device_profiles`.`device_profile_id`.
--   - Golden lookup: `device_id` -> `dim_device`.`device_id`.
-- `stg_dmp_evt_connectivity`
--   - Device lookup: `deviceid` -> `dim_device`.`device_id`.
-- `stg_dmp_relations`
--   - Device/asset relation source: map `from_id`/`to_id` to `stg_dmp_devices`.`device_id` or `stg_dmp_assets`.`asset_id` based on `from_type`/`to_type`.
--   - Feeds `dim_device_asset` and `fct_device_asset_assignment`.
-- `stg_vehicle_histories`
--   - Parking lot lookup: `pk_lot_id` -> `dim_parking_lot`.`pk_lot_id`.
--   - Fact lookup: `event_id` -> `fct_vehicle_events`.`event_id`.
-- `dim_asset`
--   - Bridge lookup: `asset_sk` -> `dim_device_asset`.`asset_sk`; `asset_id` -> `dim_device_asset`.`asset_id`.
--   - Assignment lookup: `asset_sk` -> `fct_device_asset_assignment`.`asset_sk`; `asset_id` -> `fct_device_asset_assignment`.`asset_id`.
-- `dim_asset_profile`
--   - Profile source for asset dimensions; use profile name/type attributes in `dim_asset`.
-- `dim_date`
--   - Date lookup: `date_key` -> `fct_vehicle_events`.`check_in_date_key`.
--   - Date lookup: `date_key` -> `fct_vehicle_events`.`check_out_date_key`.
--   - Date lookup: `date_key` -> `fct_parking_occupancy`.`occupancy_date_key`.
-- `dim_device`
--   - Profile lookup: `device_profile_id` -> `dim_device_profile`.`device_profile_id`.
--   - Bridge lookup: `device_sk` -> `dim_device_asset`.`device_sk`; `device_id` -> `dim_device_asset`.`device_id`.
--   - Assignment lookup: `device_sk` -> `fct_device_asset_assignment`.`device_sk`; `device_id` -> `fct_device_asset_assignment`.`device_id`.
--   - Telemetry lookup: `device_id` -> `stg_mv_dmp_tlm_*`.`deviceId`.
-- `dim_device_asset`
--   - Device lookup: `device_sk` -> `dim_device`.`device_sk`; `device_id` -> `dim_device`.`device_id`.
--   - Asset lookup: `asset_sk` -> `dim_asset`.`asset_sk`; `asset_id` -> `dim_asset`.`asset_id`.
-- `dim_device_asset_snapshot`
--   - Current bridge lookup: `device_sk`,`asset_sk` -> `dim_device_asset`.`device_sk`,`asset_sk`.
--   - Device lookup: `device_sk` -> `dim_device`.`device_sk`.
--   - Asset lookup: `asset_sk` -> `dim_asset`.`asset_sk`.
--   - SCD validity: use `dbt_valid_from` and `dbt_valid_to` for point-in-time analysis.
-- `dim_device_profile`
--   - Device lookup: `device_profile_id` -> `dim_device`.`device_profile_id`.
-- `dim_parking_lot`
--   - Vehicle events lookup: `pk_lot_id` -> `fct_vehicle_events`.`parking_lot_id`.
--   - Occupancy lookup: `pk_lot_id` -> `fct_parking_occupancy`.`parking_lot_id`.
-- `dim_parking_lot_snapshot`
--   - Current lot lookup: `pk_lot_id` -> `dim_parking_lot`.`pk_lot_id`.
--   - SCD validity: use `dbt_valid_from` and `dbt_valid_to` for point-in-time analysis.
-- `dim_time`
--   - Time lookup: `time_key` -> `fct_vehicle_events`.`check_in_time_key`.
--   - Time lookup: `time_key` -> `fct_vehicle_events`.`check_out_time_key`.
--   - Time lookup: `time_key` -> `fct_parking_occupancy`.`occupancy_time_key`.
-- `fct_device_asset_assignment`
--   - Device lookup: `device_sk` -> `dim_device`.`device_sk`; `device_id` -> `dim_device`.`device_id`.
--   - Asset lookup: `asset_sk` -> `dim_asset`.`asset_sk`; `asset_id` -> `dim_asset`.`asset_id`.
-- `fct_vehicle_events`
--   - Parking lot lookup: `parking_lot_id` -> `dim_parking_lot`.`pk_lot_id`.
--   - Check-in date lookup: `check_in_date_key` -> `dim_date`.`date_key`.
--   - Check-out date lookup: `check_out_date_key` -> `dim_date`.`date_key`.
--   - Check-in time lookup: `check_in_time_key` -> `dim_time`.`time_key`.
--   - Check-out time lookup: `check_out_time_key` -> `dim_time`.`time_key`.
-- `fct_parking_occupancy`
--   - Parking lot lookup: `parking_lot_id` -> `dim_parking_lot`.`pk_lot_id`.
--   - Date lookup: `occupancy_date_key` -> `dim_date`.`date_key`.
--   - Time lookup: `occupancy_time_key` -> `dim_time`.`time_key`.
-- `stg_mv_dmp_tlm_camera`
--   - Device lookup: `deviceId` -> `dim_device`.`device_id`.
-- `stg_mv_dmp_tlm_chiller`
--   - Device lookup: `deviceId` -> `dim_device`.`device_id`.
-- `stg_mv_dmp_tlm_energy_meter`
--   - Device lookup: `deviceId` -> `dim_device`.`device_id`.
-- `stg_mv_dmp_tlm_nvr`
--   - Device lookup: `deviceId` -> `dim_device`.`device_id`.

