# Local Dev Data Stack

StarRocks + Trino + MinIO + Hive Metastore — a minimal local data platform for Iceberg and Hive table operations.

## Services

| Service | Port | Credentials | Notes |
|---------|------|-------------|-------|
| **StarRocks FE** | `9030` (MySQL), `8030` (HTTP) | root / (none) | Frontend query node |
| **StarRocks BE** | `8040` (HTTP) | — | Backend storage node |
| **Trino** | `8085` | anonymous | Coordinator + worker |
| **MinIO** | `9000` (S3 API), `9001` (Console) | minioadmin / minioadmin | S3-compatible object storage |
| **Hive Metastore** | `9083` | internal | Iceberg + Hive table catalog |
| **PostgreSQL** | internal (5432) | hive / hive | HMS metadata backend |

## Start

```bash
docker compose up -d
```

Wait ~90s for all health checks to pass:

```bash
docker compose ps
# all services should show (healthy)
```

## Connect

### StarRocks

```bash
# CLI via docker exec
docker exec -it $(docker compose ps -q starrocks-fe) \
  mysql -h 127.0.0.1 -P 9030 -u root

# External MySQL client
mysql -h 127.0.0.1 -P 9030 -u root
```

Query external catalogs:

```sql
SET CATALOG sdp_dev_iceberg_catalog;
SHOW DATABASES;

SET CATALOG sdp_dev_hive_catalog;
SHOW DATABASES;
```

### Trino

```bash
# CLI via docker exec
docker exec -it $(docker compose ps -q trino) trino

# External Trino CLI (if installed)
trino --server localhost:8085
```

```sql
SHOW CATALOGS;
SHOW SCHEMAS FROM sdp_dev_iceberg_catalog;
SHOW SCHEMAS FROM sdp_dev_hive_catalog;
```

### MinIO

- **Console:** http://localhost:9001
- **Credentials:** minioadmin / minioadmin
- **S3 API:** http://localhost:9000

Pre-created bucket: `warehouse`

### Hive Metastore

```bash
# Thrift endpoint — no direct client needed (used by Trino/StarRocks internally)
nc -z localhost 9083 && echo "HMS reachable" || echo "HMS down"
```

## Catalogs

Both StarRocks and Trino have two pre-configured catalogs pointing to the same Hive Metastore:

| Catalog | Type | Metastore | Storage |
|---------|------|-----------|---------|
| `sdp_dev_iceberg_catalog` | Iceberg | HMS :9083 | MinIO :9000 |
| `sdp_dev_hive_catalog` | Hive | HMS :9083 | MinIO :9000 |

### Create an Iceberg table (via StarRocks)

```sql
SET CATALOG sdp_dev_iceberg_catalog;
CREATE DATABASE IF NOT EXISTS test_db;
USE test_db;

CREATE TABLE test_table (
    id BIGINT,
    name STRING,
    ts TIMESTAMP
);
INSERT INTO test_table VALUES (1, 'hello', now());
SELECT * FROM test_table;
```

### Create a Hive table (via Trino)

```sql
USE sdp_dev_hive_catalog.default;

CREATE TABLE test_hive (
    id BIGINT,
    name VARCHAR
) WITH (format = 'PARQUET');

INSERT INTO test_hive VALUES (1, 'world');
SELECT * FROM test_hive;
```

## Stop / Cleanup

```bash
docker compose down           # stop containers, keep data
docker compose down -v        # stop and delete all data
```

## Troubleshooting

**StarRocks FE stuck in INIT:** Clear stale metadata:

```bash
docker compose down -v
docker compose up -d
```

**Underscore in hostname errors:** The network is named `devnet` (clean, no underscores). If you rename the compose file directory, add `name:` to the top-level `networks.default` block.
