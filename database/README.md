# Database Init Guide

Thư mục này dùng để fake dữ liệu local, tạo schema StarRocks và import CSV vào StarRocks cho demo/chat-with-data.

## Cấu trúc

- `configs/config.yaml`: cấu hình số lượng dữ liệu fake.
- `data/*.csv`: dữ liệu CSV dùng để import.
- `docs/starrock_schema.json`: schema gốc để generate SQL/header.
- `docs/database_description.md`: mô tả bảng và relationship semantic.
- `sql/create_starrocks_schema.sql`: SQL tạo database/table/materialized view cho local fake data.
- `scripts/generate_fake_data.py`: generate CSV fake data.
- `scripts/init_db.py`: chạy SQL init schema và Stream Load CSV vào StarRocks.
- `.env`: cấu hình kết nối StarRocks.

## 1. Chuẩn bị Python dependency

```bash
pip install pymysql
```

`pymysql` chỉ cần cho script `init_db.py` để chạy SQL qua MySQL protocol của StarRocks.

## 2. Cấu hình fake data

Sửa file:

```bash
database/configs/config.yaml
```

Các biến chính:

- `device_count: max`: lấy toàn bộ device từ `data/raw_dmp_public_device.csv` làm source of truth.
- `asset_count`: số asset fake.
- `parking_lot_count`: số bãi đỗ fake.
- `days`: số ngày dữ liệu time-series/fact.
- `vehicle_events_per_day`: số lượt xe mỗi ngày.
- `telemetry_events_per_device`: số telemetry event mỗi device.
- `connectivity_events_per_device`: số connectivity event mỗi device.
- `status_events_per_device`: số status event mỗi device.

## 3. Generate fake CSV

Chạy thử, không ghi file:

```bash
python database/scripts/generate_fake_data.py config --dry-run
```

Generate thật, ghi CSV vào `database/data`:

```bash
python database/scripts/generate_fake_data.py config
```

Lưu ý:

- Script không thay đổi `database/data/raw_dmp_public_device.csv`.
- `raw_dmp_public_device.csv` là source of truth cho device id/profile/tenant/customer.
- Các bảng còn lại được generate từ registry chung để giữ mapping/FK logic.

## 4. Chạy StarRocks bằng Docker

Start StarRocks FE/BE local:

```bash
docker compose -f database/docker/docker-compose.yaml up -d
```

Kiểm tra container:

```bash
docker compose -f database/docker/docker-compose.yaml ps
```

Xem log FE/BE nếu cần:

```bash
docker compose -f database/docker/docker-compose.yaml logs -f starrocks-fe starrocks-be starrocks-init
```

Dừng service:

```bash
docker compose -f database/docker/docker-compose.yaml down
```

Xoá luôn volume StarRocks để init lại từ đầu:

```bash
docker compose -f database/docker/docker-compose.yaml down -v
```

Sau khi Docker chạy OK, giữ `.env` mặc định là dùng được với local StarRocks:

```bash
STARROCKS_HOST=localhost
STARROCKS_QUERY_PORT=9030
STARROCKS_HTTP_PORT=8030
STARROCKS_USER=root
STARROCKS_PASSWORD=
```

## 5. Cấu hình StarRocks connection

Sửa file:

```bash
database/.env
```

Các biến cần kiểm tra:

```bash
STARROCKS_HOST=localhost
STARROCKS_QUERY_PORT=9030
STARROCKS_HTTP_PORT=8030
STARROCKS_USER=root
STARROCKS_PASSWORD=
```

Trong đó:

- `STARROCKS_QUERY_PORT`: MySQL protocol port để chạy SQL.
- `STARROCKS_HTTP_PORT`: FE HTTP port để Stream Load CSV.
- `STARROCKS_TRUNCATE_BEFORE_LOAD=true`: truncate bảng trước khi load lại CSV.

## 6. Init schema và import data

Chạy full flow:

```bash
python database/scripts/init_db.py
```

Script sẽ:

1. Chạy `database/sql/create_starrocks_schema.sql`.
2. Tạo databases/schemas.
3. Tạo tables và materialized views.
4. Truncate các table loadable nếu `STARROCKS_TRUNCATE_BEFORE_LOAD=true`.
5. Stream Load CSV từ `database/data/*.csv` vào StarRocks.

## 7. Chạy từng phần

Chỉ tạo schema, không import CSV:

```bash
python database/scripts/init_db.py --skip-load
```

Chỉ import CSV, không chạy SQL create schema:

```bash
python database/scripts/init_db.py --skip-schema
```

Dùng env file khác:

```bash
python database/scripts/init_db.py --env database/.env
```

## 8. Lưu ý về bảng raw và materialized view

Với local fake data:

- Các bảng raw external trong schema gốc đã được convert thành StarRocks OLAP tables trong `sql/create_starrocks_schema.sql`.
- Vì vậy CSV local có thể Stream Load trực tiếp vào raw/stg/dim/fct tables.
- Materialized view không load CSV trực tiếp.
- Các MV như `stg_mv_dmp_tlm_camera` lấy dữ liệu từ `raw_dmp_tlm_raw`.

Telemetry MVs are created in database `sdp_near_realtime`:

| Materialized view | Database | Source table |
| --- | --- | --- |
| `stg_mv_dmp_tlm_camera` | `sdp_near_realtime` | `sdp_near_realtime.raw_dmp_tlm_raw` |
| `stg_mv_dmp_tlm_chiller` | `sdp_near_realtime` | `sdp_near_realtime.raw_dmp_tlm_raw` |
| `stg_mv_dmp_tlm_energy_meter` | `sdp_near_realtime` | `sdp_near_realtime.raw_dmp_tlm_raw` |
| `stg_mv_dmp_tlm_nvr` | `sdp_near_realtime` | `sdp_near_realtime.raw_dmp_tlm_raw` |

Fake CSV `raw_dmp_tlm_raw.deviceType` values used by these MVs are `CAMERA`, `CHILLER`, `ENERGY_METER`, and `NVR`.

To refresh manually, select the database first or use fully-qualified names. Otherwise StarRocks returns `No database selected`.

Option 1, select database first:

```sql
USE sdp_near_realtime;
REFRESH MATERIALIZED VIEW stg_mv_dmp_tlm_camera;
REFRESH MATERIALIZED VIEW stg_mv_dmp_tlm_chiller;
REFRESH MATERIALIZED VIEW stg_mv_dmp_tlm_energy_meter;
REFRESH MATERIALIZED VIEW stg_mv_dmp_tlm_nvr;
```

Option 2, use fully-qualified names:

```sql
REFRESH MATERIALIZED VIEW sdp_near_realtime.stg_mv_dmp_tlm_camera;
REFRESH MATERIALIZED VIEW sdp_near_realtime.stg_mv_dmp_tlm_chiller;
REFRESH MATERIALIZED VIEW sdp_near_realtime.stg_mv_dmp_tlm_energy_meter;
REFRESH MATERIALIZED VIEW sdp_near_realtime.stg_mv_dmp_tlm_nvr;
```

## 9. Relationship cho WrenAI

StarRocks schema không enforce FK relationship cho semantic modeling.

Relationship phục vụ WrenAI/chat-with-data nên lấy từ:

```bash
database/docs/database_description.md
```

Khuyến nghị:

- Không model relationship cho raw tables.
- Model relationship cho `stg`, `dim`, `fct`, `mart`, `stg_mv_*`.
- Ưu tiên semantic tables: `dim_*`, `fct_*`, `sdp_mart.*`.

## 10. Thứ tự chạy khuyến nghị

```bash
python database/scripts/generate_fake_data.py config --dry-run
python database/scripts/generate_fake_data.py config
docker compose -f database/docker/docker-compose.yaml up -d
python database/scripts/init_db.py --skip-load
python database/scripts/init_db.py --skip-schema
```

Hoặc chạy nhanh sau khi đã chỉnh `.env`:

```bash
python database/scripts/generate_fake_data.py config
docker compose -f database/docker/docker-compose.yaml up -d
python database/scripts/init_db.py
```





