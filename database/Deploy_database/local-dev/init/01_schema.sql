-- ============================================================
-- 01_schema.sql
-- Create database + tables for sdp_near_realtime
-- ============================================================

CREATE DATABASE IF NOT EXISTS sdp_near_realtime;
USE sdp_near_realtime;

-- ── raw_dmp_evt_connectivity ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `raw_dmp_evt_connectivity` (
  `deviceId`          varchar(64)  NOT NULL COMMENT "Device UUID",
  `tenantId`          varchar(64)  NOT NULL COMMENT "Tenant UUID",
  `ts`                bigint       NOT NULL COMMENT "Epoch milliseconds (UTC)",
  `tsDt`              datetime     NOT NULL COMMENT "Event datetime (UTC+7)",
  `msgType`           varchar(32)  NULL     COMMENT "CONNECT | DISCONNECT",
  `customerId`        varchar(64)  NULL     COMMENT "Customer UUID",
  `status`            varchar(32)  NULL     COMMENT "ONLINE | OFFLINE",
  `qualityScore`      int          NULL     COMMENT "0-100 signal quality",
  `heartbeatLevel`    varchar(16)  NULL     COMMENT "NORMAL | WARNING",
  `offlineReason`     varchar(255) NULL     COMMENT "Reason when OFFLINE"
) ENGINE=OLAP
PRIMARY KEY(`deviceId`, `tenantId`, `ts`, `tsDt`)
PARTITION BY date_trunc('day', `tsDt`)
DISTRIBUTED BY HASH(`deviceId`, `tenantId`) BUCKETS 4
PROPERTIES (
  "compression"              = "LZ4",
  "enable_persistent_index"  = "true",
  "fast_schema_evolution"    = "true",
  "replication_num"          = "1"
);

-- ── raw_dmp_tlm_raw ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `raw_dmp_tlm_raw` (
  `deviceId`   varchar(64)  NOT NULL COMMENT "Device UUID",
  `tenantId`   varchar(64)  NOT NULL COMMENT "Tenant UUID",
  `ts`         bigint       NOT NULL COMMENT "Epoch milliseconds (UTC)",
  `tsDt`       datetime     NOT NULL COMMENT "Event datetime (UTC+7)",
  `source`     varchar(255) NULL     COMMENT "Transport: mqtt | http",
  `customerId` varchar(64)  NULL     COMMENT "Customer UUID",
  `deviceType` varchar(64)  NULL     COMMENT "Device type string",
  `mqttTopic`  varchar(512) NULL     COMMENT "MQTT topic path",
  `telemetry`  json         NULL     COMMENT "Sensor payload JSON",
  `eventTime`  datetime     NULL     COMMENT "Device-reported event time"
) ENGINE=OLAP
PRIMARY KEY(`deviceId`, `tenantId`, `ts`, `tsDt`)
PARTITION BY date_trunc('day', `tsDt`)
DISTRIBUTED BY HASH(`deviceId`, `tenantId`) BUCKETS 4
PROPERTIES (
  "compression"              = "LZ4",
  "enable_persistent_index"  = "true",
  "fast_schema_evolution"    = "true",
  "replication_num"          = "1"
);
