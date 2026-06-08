# Kiến trúc Cơ sở dữ liệu (Database Architecture)

Tài liệu này mô tả chi tiết cách tổ chức và kiến trúc dữ liệu của hệ thống, dựa trên định nghĩa schema trong file `Starrock_Schema.txt`.

Hệ thống tuân theo mô hình **Data Lakehouse** (cụ thể là **Medallion Architecture**), kết hợp với khả năng phân tích thời gian thực (Real-time Analytics) của StarRocks. Dữ liệu được chia thành 4 lớp (layer) lưu trữ chính, sử dụng dbt (Data Build Tool) để thực hiện quy trình ELT/ETL.

---

## 1. Lớp Near Real-Time (Dữ liệu thời gian thực)
Lớp này lưu trữ trực tiếp bên trong StarRocks để phục vụ các truy vấn yêu cầu độ trễ thấp nhất. Dữ liệu là các luồng sự kiện (streaming events) đẩy liên tục vào hệ thống.

* **Catalog / Database**: `default_catalog.sdp_near_realtime`
* **Công nghệ / Engine**: Bảng nội bộ của StarRocks (OLAP Engine).
* **Đặc điểm kỹ thuật**:
  * Sử dụng `PRIMARY KEY` (ví dụ: `deviceId`, `tenantId`, `ts`, `tsDt`) để xử lý upsert tốc độ cao.
  * Phân mảnh (`PARTITION`) theo ngày (`tsDt`).
  * Phân tán dữ liệu (`DISTRIBUTED BY HASH`) theo `deviceId`, `tenantId`.

**Danh sách các bảng:**
* `raw_dmp_evt_connectivity`: Lưu trữ các sự kiện kết nối của thiết bị (trạng thái online/offline, lý do mất kết nối, điểm chất lượng đường truyền).
* `raw_dmp_tlm_raw`: Lưu trữ dữ liệu đo lường thô (telemetry) của thiết bị ở định dạng JSON (`telemetry`), kèm theo metadata thời gian và nguồn phát.

---

## 2. Lớp Raw / Bronze (Dữ liệu thô)
Lớp này chứa dữ liệu nguyên bản chưa qua xử lý được đổ từ các hệ thống nguồn (như cơ sở dữ liệu gốc, hệ thống quản lý đỗ xe, v.v.) vào Data Lake.

* **Catalog / Database**: `sdp_dev_hive_catalog.sdp_raw`
* **Công nghệ**: External Tables thông qua **Hive Metastore**. Lưu trữ file vật lý trên AWS S3 (`s3://sdp-dev-raw-803067574897/raw/...`) dưới định dạng **Parquet**.
* **Đặc điểm kỹ thuật**: Phân vùng (Partition) theo ngày hệ thống tiếp nhận `processing_day`.

**Danh sách các bảng:**
* `raw_dmp_public_asset`: Thông tin gốc của các tài sản (Assets).
* `raw_dmp_public_asset_profile`: Cấu hình hồ sơ của các tài sản (Asset Profiles).
* `raw_dmp_public_device`: Thông tin gốc của các thiết bị (Devices).
* `raw_dmp_public_device_profile`: Cấu hình hồ sơ thiết bị (Device Profiles).
* `raw_dmp_public_relation`: Quan hệ giữa các thực thể (Ví dụ: Thiết bị này thuộc về tài sản nào).
* `raw_parking_db_vehicle_histories`: Lịch sử lưu thông của xe cộ trong bãi đỗ (thời gian ra/vào, biển số, hình ảnh, phí, loại thanh toán, v.v.).

---

## 3. Lớp Staging / Silver (Dữ liệu trung gian / Làm sạch)
Lớp này chứa dữ liệu đã được làm sạch, chuẩn hóa kiểu dữ liệu, đổi tên cột cho dễ hiểu và lọc bỏ rác từ lớp Raw. 

* **Catalog / Database**: `sdp_dev_iceberg_catalog.sdp_staging`
* **Công nghệ**: External Tables thông qua **Apache Iceberg**. Lưu trữ file vật lý trên AWS S3 (`s3://sdp-dev-staging-803067574897/staging/...`).
* **Đặc điểm kỹ thuật**:
  * Iceberg cung cấp ACID transaction, hỗ trợ việc chạy dbt model an toàn.
  * Dữ liệu có thêm các cột metadata của dbt như `_dbt_loaded_at`.

**Danh sách các bảng:**
* `stg_dmp_assets`, `stg_dmp_asset_profiles`: Dữ liệu Asset đã chuẩn hóa.
* `stg_dmp_devices`, `stg_dmp_device_profiles`: Dữ liệu Device đã chuẩn hóa.
* `stg_dmp_device_status_events`: Bảng tổng hợp trạng thái sự kiện của thiết bị (online/offline, lý do thay đổi trạng thái).
* `stg_dmp_evt_connectivity`: Dữ liệu kết nối mạng đã chuẩn hóa.
* `stg_dmp_relations`: Dữ liệu quan hệ đã chuẩn hóa.
* `stg_vehicle_histories`: Dữ liệu lịch sử bãi đỗ xe đã chuẩn hóa lại các kiểu dữ liệu thời gian (`datetime`), số tiền, và thông tin thẻ.

---

## 4. Lớp Golden / Gold (Dữ liệu phục vụ / Phân tích)
Lớp cao cấp nhất được thiết kế theo dạng Star Schema (Dimensional Modeling) để trực tiếp phục vụ cho việc tạo báo cáo (BI Dashboards), phân tích sâu và AI.

* **Catalog / Database**: `sdp_dev_iceberg_catalog.sdp_golden`
* **Công nghệ**: Apache Iceberg, lưu trữ trên AWS S3.
* **Đặc điểm kỹ thuật**: Dữ liệu có tính nhất quán cao nhất, tối ưu cho hoạt động Join và Aggregate.

**Danh sách các bảng (Dimension Tables):**
* `dim_asset`: Bảng chiều chứa thông tin hợp nhất về Tài sản (đã được làm phẳng với `asset_profile_id` và các mô tả). Khóa chính thay thế là `asset_sk`.
* `dim_asset_profile`: Bảng chiều chứa thông tin hồ sơ tài sản.
* `dim_date`: Bảng chiều thời gian chuẩn (Date Dimension) chứa đầy đủ các phân cấp ngày, tuần, tháng, quý, năm, ngày lễ, v.v. để sử dụng làm mốc phân tích chuỗi thời gian.
*(Trong tương lai lớp này sẽ có thêm các Fact Tables).*

---

## Sự khác biệt khi triển khai cục bộ với MinIO so với kiến trúc ban đầu trên AWS S3

Do yêu cầu triển khai hoàn toàn bằng Container và không kết nối trực tiếp với AWS S3, chúng ta sử dụng **MinIO** đóng vai trò làm Object Storage nội bộ thay thế. Sự thay đổi này kéo theo một vài khác biệt về mặt kiến trúc phần cứng và cấu hình mạng như sau:

1. **Lớp Lưu trữ Vật lý (Storage Layer)**:
   - **Kiến trúc ban đầu**: Các file Parquet của lớp Raw, Staging, Golden được lưu trên đám mây AWS S3 (`s3://sdp-dev-raw-803067574897/...`), đòi hỏi kết nối Internet và quản lý chi phí AWS.
   - **Với MinIO**: MinIO cung cấp một API tương thích 100% với S3 nhưng chạy hoàn toàn cục bộ (Local Container). Các đường dẫn `s3://...` trong schema sẽ được "đánh lừa" để trỏ thẳng vào vùng nhớ của container MinIO. Điều này giúp hệ thống truy xuất file cực nhanh (độ trễ mạng nội bộ) và hoàn toàn miễn phí, rất lý tưởng để phát triển hoặc kiểm thử.

2. **Lớp Quản lý Siêu dữ liệu (Catalog Layer)**:
   - **Kiến trúc ban đầu**: Trên AWS, hệ thống có thể đang tận dụng AWS Glue Data Catalog làm nơi lưu trữ siêu dữ liệu cho cả Hive và Iceberg.
   - **Với MinIO**: Vì chạy offline, ta bắt buộc phải tự dựng các container làm nhiệm vụ quản lý Catalog. Cụ thể, kiến trúc mới sẽ có thêm container **Hive Metastore** (đi kèm PostgreSQL) để quản lý cấu trúc bảng cho lớp Raw, và container **Iceberg REST Catalog** để quản lý cho lớp Staging/Golden.

3. **Cấu hình Kết nối (Endpoint & Authentication)**:
   - **Kiến trúc ban đầu**: Xác thực bằng AWS IAM Role hoặc Access Keys thực tế của AWS.
   - **Với MinIO**: Không sử dụng IAM. StarRocks và các Catalog sẽ được cấu hình để kết nối tới S3 Endpoint ảo (ví dụ: `http://minio:9000`) và sử dụng các cặp Key cục bộ (như `minioadmin` / `minioadmin`). Thuộc tính `aws.s3.enable_path_style_access = true` sẽ được bật để tương thích với cách MinIO định dạng URI.

Tóm lại, việc sử dụng MinIO **không làm thay đổi logic tổ chức dữ liệu 4 lớp** (Data Lakehouse), mà chỉ thay đổi **cách hệ thống phân giải đường dẫn và quản lý metadata** ở dưới nền tảng (Infrastructure), giúp toàn bộ hệ thống "đóng gói" (containerized) được mà không phụ thuộc vào Internet.
