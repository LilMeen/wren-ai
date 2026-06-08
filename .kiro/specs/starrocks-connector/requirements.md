# Requirements Document

# StarRocks Connector

## Introduction

Tài liệu này định nghĩa các yêu cầu chức năng và phi chức năng cho feature thêm StarRocks làm data source connector mới trong Wren AI.

**Bối cảnh:** StarRocks là một OLAP database hiệu năng cao sử dụng MySQL wire protocol (port 9030). Feature này cho phép người dùng kết nối Wren AI với StarRocks để khám phá schema và thực thi AI-generated SQL queries — bao gồm cả tables từ native catalog lẫn external catalogs (Hive, Iceberg).

**Phạm vi thay đổi:** ibis-server (Python/FastAPI) và wren-ui (TypeScript/Next.js). Không có dependency mới.

## Glossary

| Thuật ngữ | Định nghĩa |
|-----------|-----------|
| **StarRocks FE** | Frontend node của StarRocks cluster, tiếp nhận SQL query qua MySQL protocol port 9030 |
| **ibis-server** | Python service trong Wren AI chịu trách nhiệm kết nối database và thực thi query |
| **wren-ui** | Next.js frontend service của Wren AI |
| **Catalog** | Namespace cấp cao nhất trong StarRocks, chứa nhiều databases/schemas. `default_catalog` là catalog native; external catalogs trỏ đến Hive/Iceberg. |
| **Multi-catalog** | Khả năng của StarRocks expose nhiều catalogs trong cùng một connection |
| **Fully-qualified name** | Tên table đầy đủ dạng `catalog.schema.table` |
| **Connection info** | Tập hợp thông tin kết nối: host, port, database, user, password |
| **ibis** | Python library abstraction layer dùng MySQL backend để kết nối StarRocks |

## Overview

Tích hợp StarRocks làm data source mới trong Wren AI, cho phép người dùng kết nối, khám phá schema và thực thi query lên StarRocks OLAP database — bao gồm native tables và external catalog tables (Hive/Iceberg).

---

## Requirements

### Requirement 1: Kết nối StarRocks qua MySQL protocol

**User Story:** Là một người dùng Wren AI, tôi muốn kết nối đến StarRocks bằng cách nhập host, port, database, username và password — để tôi có thể dùng StarRocks như một data source trong Wren AI.

#### Acceptance Criteria

- 1.1: Hệ thống phải nhận connection info gồm 5 trường bắt buộc: `host`, `port` (default 9030), `database`, `user`, `password`. `password` là trường optional (có thể để trống).
- 1.2: Khi kết nối thành công, ibis-server phải patch `connection.con.get_autocommit = lambda: True` để tránh lỗi transaction wrap của StarRocks MySQL protocol.
- 1.3: Trường `password` phải được encrypt trước khi lưu vào database của Wren AI, và chỉ được decrypt khi cần gửi đến ibis-server.
- 1.4: Khi kết nối thất bại (host không reach được, sai credentials, port timeout), hệ thống phải trả về lỗi rõ ràng — không crash silently.
- 1.5: Wren UI phải hiển thị form nhập connection info với placeholder port là `9030`.

---

### Requirement 2: Khám phá schema multi-catalog

**User Story:** Là một người dùng Wren AI, tôi muốn xem toàn bộ tables từ tất cả catalogs của StarRocks (bao gồm `default_catalog`, Hive catalog, Iceberg catalog) — để tôi có thể model data từ nhiều nguồn khác nhau trong cùng một project.

#### Acceptance Criteria

- 2.1: Hệ thống phải tự động discover tất cả catalogs qua `SHOW CATALOGS`. Nếu lệnh này thất bại, phải báo lỗi rõ ràng thay vì silently fallback.
- 2.2: Tên table trong Wren AI phải theo format đầy đủ `catalog.schema.table` cho tất cả catalogs — kể cả `default_catalog` — để đảm bảo uniqueness tuyệt đối và tránh collision.
- 2.3: Nếu một catalog không query được (ví dụ external catalog offline), hệ thống phải log warning rõ tên catalog nào bị thiếu và lý do — không bỏ qua silently, không fail toàn bộ request.
- 2.4: Catalog name được lấy từ `SHOW CATALOGS` phải được whitelist-validate (chỉ chấp nhận `[a-zA-Z0-9_-]`) trước khi inject vào SQL query, để ngăn SQL injection qua tên catalog.
- 2.5: `get_schema_list()` phải trả về danh sách `Catalog` objects, mỗi object chứa catalog name và list schemas bên trong — không gộp chung các schemas từ các catalogs khác nhau.
- 2.6: `get_constraints()` phải trả về list rỗng vì StarRocks không hỗ trợ foreign key constraints.

---

### Requirement 3: Type mapping StarRocks → Wren AI

**User Story:** Là một người dùng Wren AI, tôi muốn các column types của StarRocks được map đúng sang Wren AI types — để AI có thể generate SQL chính xác cho từng kiểu dữ liệu.

#### Acceptance Criteria

- 3.1: Hệ thống phải map đầy đủ các StarRocks types sau: `char`, `varchar`, `string`, `text`, `tinyint`, `smallint`, `int`, `integer`, `mediumint`, `bigint`, `largeint`, `boolean`, `bool`, `float`, `double`, `decimal`, `decimalv3`, `numeric`, `date`, `datetime`, `timestamp`, `json`, `array`, `map`, `struct`, `hll`, `bitmap`, `percentile`.
- 3.2: Column type từ `information_schema.COLUMNS` có thể chứa precision/params (ví dụ `decimal(18,4)`, `varchar(255)`, `array<int>`). Hệ thống phải strip precision trước khi lookup type mapping.
- 3.3: Type `largeint` (128-bit integer) phải được map về `BIGINT` (64-bit). Đây là known limitation — giá trị vượt ±9.2×10¹⁸ sẽ bị truncate silently.
- 3.4: Với StarRocks type không có trong mapping, hệ thống phải trả về `UNKNOWN` và log warning — không throw exception.
- 3.5: `json`, `array`, `map`, `struct` columns phải được cast sang `string` khi trả kết quả query để tránh PyArrow type incompatibility.

---

### Requirement 4: Thực thi SQL query

**User Story:** Là một người dùng Wren AI, tôi muốn chạy SQL query lên StarRocks — bao gồm query cross-catalog dùng fully-qualified table name — để tôi có thể phân tích dữ liệu từ bất kỳ catalog nào.

#### Acceptance Criteria

- 4.1: Hệ thống phải thực thi SQL query qua ibis MySQL backend kết nối vào StarRocks FE port 9030.
- 4.2: SQL query có thể dùng fully-qualified table name dạng `catalog.schema.table` (ví dụ `SELECT * FROM sdp_dev_hive_catalog.sdp_raw.foo`). StarRocks tự resolve cross-catalog reference — ibis-server không cần gửi `USE CATALOG` trước mỗi query.
- 4.3: Kết quả query phải được trả về dưới dạng Apache Arrow format, consistent với các data sources khác trong Wren AI.
- 4.4: `decimal` columns phải được round trước khi convert sang PyArrow để tránh precision overflow.

---

### Requirement 5: Hiển thị StarRocks trong Wren UI

**User Story:** Là một người dùng Wren AI, tôi muốn thấy StarRocks trong danh sách data sources khi thiết lập project mới — để tôi có thể chọn StarRocks như các database khác (MySQL, PostgreSQL, v.v.).

#### Acceptance Criteria

- 5.1: StarRocks phải xuất hiện trong danh sách data sources của Wren UI với tên hiển thị là `StarRocks`.
- 5.2: StarRocks phải có icon riêng (`/images/dataSource/starrocks.svg`).
- 5.3: Form nhập connection info của StarRocks phải có các fields: Display name, Host, Port (placeholder `9030`), Username, Password, Database name. Không có SSL toggle.
- 5.4: Khi ở chế độ edit, các trường `host`, `port`, `database` phải bị disabled — consistent với các connectors khác.

---

### Requirement 6: Không có dependency mới

**User Story:** Là một developer maintain Wren AI, tôi muốn StarRocks connector không thêm dependency mới vào project — để không làm tăng bundle size hay introduce security risk từ package mới.

#### Acceptance Criteria

- 6.1: ibis-server phải reuse `ibis-framework[mysql]` và `PyMySQL`/`mysqlclient` đã có — không thêm StarRocks-specific driver.
- 6.2: wren-ui phải reuse các TypeScript types và patterns đã có — không thêm npm package mới.
