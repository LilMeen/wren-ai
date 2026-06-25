# Đề xuất Outline — Tài liệu Thiết kế Hệ thống (System Design Document) Wren AI

Tài liệu này đề xuất cấu trúc (outline) và nội dung cần viết cho tài liệu **System Design** của toàn bộ hệ thống Wren AI. Mỗi dòng trong bảng là một heading; cột **Cấp** thể hiện vị trí trên cây thư mục heading.

## Quy ước & ghi chú chung

- **Phạm vi đã khảo sát:** conceptual diagram (`docs/software_architecture/images/wren-ai-architecture-Conceptual Diagram.drawio.svg`) và codebase của 3 cấu phần chính: `wren-ui/` (Next.js + Apollo GraphQL BFF), `wren-ai-service/` (FastAPI + pipeline AI), `wren-engine/` (ibis-server Python + wren-core Rust + wren Java).
- **Diagram đang có sẵn (tái sử dụng):** (1) UI prototype, (2) Conceptual diagram, (3) Sequence diagram cho use case chính "user ask question". Outline bên dưới chỉ rõ chỗ chèn 3 diagram này và đề xuất thêm các diagram còn thiếu trong cột **Note**.
- **Trạng thái nguồn:** `docs/software_architecture/sad.md` và `docs/functional_specification/fsd.md` hiện đang trống → tài liệu này viết mới gần như từ đầu.
- **Ngôn ngữ:** viết tiếng Việt có dấu; giữ nguyên tiếng Anh cho thuật ngữ phổ biến (system design, text-to-SQL, RAG, pipeline, BFF, MDL, embedding, sequence diagram...).

## Bảng outline đề xuất

| Cấp | Tiêu đề | Mô tả | Note |
|-----|---------|-------|------|
| 1 | Giới thiệu (Introduction) | Mở đầu tài liệu: nêu mục đích, phạm vi và tài liệu tham khảo. | |
| 1.1 | Mục đích tài liệu | Giải thích tài liệu mô tả thiết kế kiến trúc & thiết kế chi tiết của hệ thống Wren AI, phục vụ ai (dev mới, kiến trúc sư, QA, vận hành) và dùng khi nào. | |
| 1.2 | Phạm vi (Scope) | Khoanh vùng: tập trung 3 cấu phần chính (Wren UI, Wren AI Service, Wren Engine) + các phụ thuộc ngoài (LLM Provider, Vector DB, App Database, Data Sources). Nêu rõ phần KHÔNG nằm trong phạm vi (wren-launcher...). | |
| 1.3 | Tài liệu tham khảo (References) | Liên kết tới: FSD (functional spec), README các subproject, conceptual diagram, UI prototype, repo gốc WrenAI. | |
| 2 | Kiến trúc tổng thể (High-level Architecture) | Mô tả kiến trúc mức conceptual cho toàn hệ thống. | **Chèn Conceptual diagram (có sẵn) tại đây.** |
| 2.1 | Conceptual diagram & diễn giải | Đưa conceptual diagram và giải thích từng khối + ý nghĩa các luồng (Request/Response, Question, Generate SQL, Define Schema/MDL, Connect, Query Data, Prompt/Answer). | Dùng ảnh trong `docs/software_architecture/images/`. |
| 2.2 | Các cấu phần chính & trách nhiệm | Bảng tóm tắt từng cấu phần: Wren UI (frontend + BFF), Wren AI Service, Wren Engine, LLM Provider, Vector Database, App Database, Data Sources — vai trò một dòng mỗi cái. | |
| 2.3 | Sơ đồ container (C4 Container) | Vẽ hệ thống ở mức container: tiến trình/dịch vụ, giao thức giữa chúng (HTTP/GraphQL/REST), DB và hàng đợi background. | **Cần bổ sung diagram mới (C4 Container)** — conceptual diagram chưa thể hiện rõ ranh giới tiến trình & giao thức. |
| 2.4 | Luồng tương tác giữa các service (Service-to-service) | Mô tả wren-ui → ai-service (async + polling), wren-ui → ibis-server, ai-service → wren engine (semantic SQL), ai-service → LLM/Vector DB, ai-service ↔ wren-ui callback (`/api/graphql`). | Nhấn mạnh pattern async: POST tạo task trả `{id}` → GET poll status. |
| 2.5 | Tech stack | Liệt kê công nghệ theo cấu phần: TypeScript/Next.js/Apollo/knex; Python/FastAPI/Hamilton/Haystack/LiteLLM/Qdrant; Rust (wren-core)/Java (wren legacy)/ibis. | Có thể làm dạng bảng theo cột (Cấu phần / Ngôn ngữ / Framework / Lưu trữ). |
| 3 | Wren UI — Frontend & BFF | Thiết kế chi tiết cấu phần Wren UI. | **Chèn UI prototype (có sẵn) trong mục con phù hợp (3.2).** |
| 3.1 | Tổng quan & trách nhiệm | Next.js 14 vừa là frontend vừa là backend-for-frontend (Apollo GraphQL server); là nơi điều phối modeling, asking, dashboard, kết nối data source. | |
| 3.2 | Kiến trúc Frontend | Cấu trúc `src/pages`, `src/components`, `src/hooks`; luồng UI chính (setup wizard, modeling, home/ask, dashboard); Apollo Client + codegen typed hooks. | **Chèn UI prototype tại đây**; bổ sung sơ đồ điều hướng (navigation map) nếu cần. |
| 3.3 | Kiến trúc Backend (Apollo GraphQL BFF) | Mô tả kiến trúc phân lớp: `schema.ts` (SDL) → `resolvers.ts`/`resolvers/*` → `services/*` → `adaptors/*` (HTTP client) → `repositories/*` (knex DB). Inject qua `IContext`. | **Cần bổ sung component diagram phân lớp** của BFF. |
| 3.4 | Adaptors (tích hợp service ngoài) | `wrenAIAdaptor` (→ ai-service), `ibisAdaptor` (→ ibis-server, đọc constraints/FK), `wrenEngineAdaptor`, `openMetadataAdaptor`. Mô tả pattern axios + polling 2s. | |
| 3.5 | App Database (knex repositories) | Vai trò DB lưu project/model/column/relationship/thread/dashboard/instruction/deploy log...; liệt kê nhóm repository chính. | **Cần bổ sung ERD** (mục 6.2 chi tiết, ở đây chỉ tổng quan). |
| 3.6 | Background trackers / jobs | `askingTaskTracker`, `chart`, `recommend-question`, `textBasedAnswerBackgroundTracker`, `dashboardCacheBackgroundTracker`, `adjustmentBackgroundTracker` — cơ chế poll trạng thái từ ai-service và cập nhật DB. | Giải thích vì sao cần background polling (ai-service trả async). |
| 3.7 | Các module nghiệp vụ chính | Modeling/diagram, Asking (thread/threadResponse), Dashboard, Instruction, SQL Pair, Ontology, Learning, API History — tóm tắt mỗi module gồm resolver/service/repo nào. | Ontology là tính năng tự thêm; nêu ở mức kiến trúc. |
| 4 | Wren AI Service — AI Pipelines | Thiết kế chi tiết cấu phần AI. | |
| 4.1 | Tổng quan & trách nhiệm | FastAPI service chạy các pipeline AI: indexing, retrieval, generation; điều phối LLM + Vector DB + Wren Engine. | |
| 4.2 | Mô hình API bất đồng bộ (Async task pattern) | Mô tả pattern: `POST /v1/<feature>` tạo background task → `{query_id}`; `GET /v1/<feature>/{id}/result` poll `{status, response, error}`; có thêm streaming-result (SSE). | Lấy `ask.py` router làm ví dụ minh hoạ; liệt kê enum status. |
| 4.3 | Kiến trúc Pipeline (Hamilton DAG + Haystack) | Giải thích pipeline = DAG bất đồng bộ; system/user prompt template ở đầu mỗi file; `BasicPipeline`; cách compose component. | **Cần bổ sung diagram khái niệm pipeline/DAG.** |
| 4.4 | Providers (lớp trừu tượng hạ tầng) | `llm/litellm`, `embedder/litellm`, `document_store/qdrant`, `engine/wren` — abstraction cho đa LLM/embedding/vector store/engine; loader đọc config. | Nhấn tính hoán đổi provider qua config.yaml. |
| 4.5 | Indexing pipelines | `db_schema`, `table_description`, `historical_question`, `instructions`, `sql_pairs`, `project_meta` — biến MDL/metadata thành embedding lưu vào Vector DB khi deploy. | Liên kết với luồng "Define Schema/MDL → Embedding & Index Processing" trong conceptual diagram. |
| 4.6 | Retrieval pipelines | `db_schema_retrieval`, `historical_question_retrieval`, `sql_pairs_retrieval`, `instructions`, `sql_functions`, `sql_knowledge`, `sql_executor` — truy hồi ngữ cảnh từ Vector DB cho prompt. | Đây là phần "Retrieval → Vector Database" trong conceptual diagram. |
| 4.7 | Generation pipelines | `intent_classification`, `sql_generation` (+ reasoning, followup, regeneration, correction, diagnosis), `sql_answer`, `chart_generation`/`chart_adjustment`, `data_assistance`, `misleading_assistance`, `user_guide_assistance`, các recommendation. | Phân nhóm: classify intent / sinh SQL / sinh câu trả lời & chart / hỗ trợ & gợi ý. |
| 4.8 | RAG & quản lý ngữ cảnh | Cách kết hợp retrieval (schema, sql pairs, instructions, historical) + custom instruction + ontology để xây prompt; vai trò Prompt Builder. | Đối chiếu "Prompt Builder ← DB Schema/Table description/Instruction/SQL samples". |
| 4.9 | Cấu hình & feature flags | `config.py`/`config.yaml`: ngưỡng retrieval, batch size, `allow_intent_classification`, `allow_sql_generation_reasoning`, `max_sql_correction_retries`, cache TTL, engine timeout... | Nêu thứ tự ưu tiên config: default → env → .env → config.yaml. |
| 5 | Wren Engine — Semantic Layer & Connectors | Thiết kế chi tiết cấu phần Engine. | |
| 5.1 | Tổng quan & trách nhiệm | Engine nhận semantic SQL + MDL manifest, validate/rewrite/transpile sang SQL dialect của data source, rồi execute và trả dữ liệu. | |
| 5.2 | Thành phần & ngôn ngữ | `ibis-server` (Python FastAPI, routers v2/v3), `wren-core` (Rust, lõi semantic), `wren` (Java legacy), `wren-core-py`/`wasm` binding. | Làm rõ cái nào đang là đường chính (ibis-server + wren-core). |
| 5.3 | MDL & Semantic processing | `app/mdl/*`: `analyzer`, `core`, `rewriter`, `substitute`, `java_engine`, `knowledge` — cách MDL được phân tích và dùng để rewrite SQL. | |
| 5.4 | Validator / Rewriter / Transpiler | Map các khối trong conceptual diagram (Validator → Rewriter → Transpiler → Data source Connector) vào code thực tế (`model/validator.py`, mdl rewriter, custom_sqlglot dialects). | **Cần bổ sung diagram luồng xử lý SQL trong engine.** |
| 5.5 | Data Source Connectors | `model/connector.py`, `data_source.py`, `metadata/*`: đọc metadata/constraints và execute query; danh sách data source hỗ trợ. | Liệt kê các data source (Postgres, MySQL, BigQuery...) theo dialects/connector hiện có. |
| 5.6 | Query cache & dry plan | `query_cache`, cơ chế `use_dry_plan`/`allow_dry_plan_fallback` để validate/plan trước khi chạy thật. | |
| 6 | Mô hình dữ liệu (Data Model) | Tập hợp toàn bộ mô hình dữ liệu của hệ thống. | |
| 6.1 | MDL (Modeling Definition Language) | Mô tả cấu trúc MDL: model, column, relationship, metric, view; vai trò là "semantic manifest" dùng chung cho ai-service và engine. | **Cần ví dụ MDL JSON** minh hoạ. |
| 6.2 | App Database (Wren UI) | Lược đồ các bảng chính qua repositories: project, model, modelColumn, relationship, thread/threadResponse, dashboard, instruction, sqlPair, deployLog, apiHistory, user/session. | **Cần bổ sung ERD đầy đủ.** |
| 6.3 | Vector Database (Qdrant) | Các collection/embedding lưu trữ: db schema, table description, historical question, instructions, sql pairs; lưu ý cấu hình indexing. | Liên hệ ghi chú vận hành về indexing/readiness nếu phù hợp. |
| 7 | Các vấn đề xuyên suốt (Cross-cutting Concerns) | Khía cạnh áp dụng cho toàn hệ thống. | |
| 7.1 | Xác thực & phân quyền (Auth) | Cơ chế auth (authService) và auth service-to-service giữa ai-service ↔ wren-ui. | Có phần auth tự thêm trong fork — mô tả thiết kế, không lộ secret. |
| 7.2 | Cấu hình & quản lý môi trường | Tổng hợp cách config từng cấu phần (env, .env, config.yaml, docker env) và thứ tự ưu tiên. | |
| 7.3 | Observability & Logging | Langfuse tracing (`@observe`, trace_metadata), logging, telemetry trong wren-ui. | |
| 7.4 | Xử lý lỗi & độ bền (Error handling & Resilience) | Mã lỗi ask (NO_RELEVANT_DATA/NO_RELEVANT_SQL/OTHERS), retry sql correction, dry plan fallback, invariant Error.message luôn là string ở GraphQL. | Liên hệ ghi chú nội bộ về lỗi ibis 422 làm crash thread query. |
| 7.5 | Caching & Performance | TTLCache trong ai-service, query cache engine, dashboard cache, polling interval. | |
| 8 | Triển khai & Vận hành (Deployment & Operations) | Cách build, đóng gói và chạy hệ thống. | **Cần bổ sung deployment diagram.** |
| 8.1 | Mô hình triển khai (Deployment view) | docker-compose: các container, network/subnet, port, biến môi trường giữa các service. | **Chèn deployment diagram**; tham chiếu `docker/` và `deployment/`. |
| 8.2 | Build & môi trường phát triển | Lint/prettier strict khi build wren-ui, codegen cần server; cách chạy từng service local. | |
| 8.3 | Khả năng mở rộng & vận hành | Hướng scale (background workers, vector DB), điểm nghẽn tiềm năng, monitoring/health check. | |
| 9 | Lịch sử thay đổi tài liệu | Bảng version/ngày/người sửa/nội dung thay đổi. | |

## Tổng hợp các diagram cần bổ sung

Để tài liệu đầy đủ, ngoài 3 diagram đã có (UI prototype, Conceptual, Sequence "user ask question"), nên bổ sung:

1. **C4 Container diagram** (mục 2.3) — ranh giới tiến trình + giao thức.
2. **Component diagram phân lớp Wren UI BFF** (mục 3.3) — schema/resolver/service/adaptor/repository.
3. **ERD App Database** (mục 3.5 / 6.2).
4. **Diagram pipeline/DAG của AI Service** (mục 4.3).
5. **Diagram luồng xử lý SQL trong Wren Engine** (mục 5.4) — validate → rewrite → transpile → execute.
6. **Deployment diagram** (mục 8.1).

---

# Đề xuất Outline — Tài liệu Hướng dẫn Vận hành (how-to-run.md)

Tài liệu `how-to-run.md` là **hướng dẫn thực hành (operational runbook)** giúp một người **hoàn toàn mới** có thể tự dựng, chạy và triển khai hệ thống Wren AI trên cả 3 môi trường. Khác với SAD (mô tả "hệ thống là gì"), tài liệu này trả lời "làm thế nào để chạy nó" theo từng bước bấm-gõ cụ thể.

## Quy ước & ghi chú chung (cho how-to-run.md)

- **Nguồn tham chiếu chính:** mục 8.2 trong `sad.md` (CI/CD & môi trường), 2 workflow `.github/workflows/deploy.yml` + `sit.yml`, 3 file `docker/docker-compose.{prod,sit,dev}.yaml`, và 4 file env `docker/.env`, `.env.sit`, `.env.dev`, `.env.example`.
- **Đối tượng:** người mới hoàn toàn — mỗi bước cần ghi rõ chạy ở đâu (GitHub web / máy local / VM server), gõ lệnh gì, kỳ vọng kết quả gì.
- **Nguyên tắc cơ chế chạy:** mọi lệnh tuân theo `docker compose --env-file <.env|.env.sit|.env.dev> -f docker-compose.<prod|sit|dev>.yaml <command>`.
- **Bảo mật:** tuyệt đối không commit `.env` thật, `OPENAI_API_KEY`, `DOCKERHUB_TOKEN`, SSH key... vào repo. Nhấn mạnh điểm này xuyên suốt.

## Bảng outline đề xuất (how-to-run.md)

| Cấp | Tiêu đề | Mô tả | Note |
|-----|---------|-------|------|
| 1 | Giới thiệu | Mục đích runbook, đối tượng (người mới), và cách dùng tài liệu. | |
| 1.1 | Tài liệu này dành cho ai | Nêu rõ: người chưa từng dựng hệ thống, cần làm theo từng bước. Phân biệt với `sad.md` (kiến trúc) và `configuration.md` (cấu hình LLM). | |
| 1.2 | Tổng quan 3 môi trường | Bảng brief: vai trò + khi nào dùng + nguồn image của **production / SIT / development**. | Lấy từ bảng mục 8.2 của sad.md. |
| 1.3 | Mô hình build → push → deploy | Sơ đồ 1 hình tóm tắt luồng tổng: code → CI build image → Docker Hub → môi trường pull/up. | **Cần 1 diagram tổng** (có thể tái dùng từ 8.2.2 sad.md). |
| 2 | Yêu cầu & chuẩn bị (Prerequisites) | Những thứ phải có trước khi bắt đầu. | |
| 2.1 | Công cụ cần cài | Git, Docker + Docker Compose v2 (lệnh `docker compose`), tài khoản GitHub, tài khoản Docker Hub. Ghi rõ cách kiểm tra phiên bản. | |
| 2.2 | Clone source & submodule | `git clone` kèm `--recurse-submodules` (vì `wren-engine` là git submodule); cách init submodule nếu quên. | Đối chiếu `.gitmodules` + `submodules: recursive` trong workflow. |
| 2.3 | Khoá & secret cần chuẩn bị trước | Liệt kê: `OPENAI_API_KEY` (hoặc LLM khác), tài khoản Docker Hub, SSH access tới VM (cho prod). Giải thích lấy từ đâu. | |
| 3 | Thiết lập Docker Hub (step by step) | Hướng dẫn dựng registry để CI push và môi trường pull. | |
| 3.1 | Tạo tài khoản & repository | Tạo account Docker Hub; giải thích image sẽ đẩy lên là `<username>/wren-ui`, `wren-ai-service`, `wren-engine-ibis`, `wren-engine`. | Tên image khớp `secrets.DOCKERHUB_USERNAME/<image>` trong workflow. |
| 3.2 | Tạo Access Token | Vào Account Settings → Security → New Access Token; chọn quyền Read/Write; **copy token ngay** (chỉ hiện 1 lần). | Token này dùng cho `DOCKERHUB_TOKEN`. |
| 3.3 | Cơ chế tag image theo môi trường | Giải thích: prod đẩy tag `:latest` + `:<git-sha>`; SIT đẩy tag `:sit` + `:<git-sha>`; dev không đẩy (build local). | Lấy từ `deploy.yml`/`sit.yml`. |
| 3.4 | Lưu ý về username trong compose | Cảnh báo: `docker-compose.prod/sit.yaml` đang hardcode prefix image (`lilmeen1012/...`); người mới cần đổi sang Docker Hub username của mình. | **Quan trọng** — dễ vấp; chỉ rõ dòng cần sửa. |
| 4 | Thiết lập GitHub Secrets (step by step) | Cấu hình secret để 2 workflow CI chạy được. | |
| 4.1 | Vào đúng nơi cấu hình | Repo → Settings → Secrets and variables → Actions → New repository secret. Kèm ảnh chụp/hướng dẫn đường dẫn. | **Cần screenshot** minh hoạ. |
| 4.2 | Bảng secret bắt buộc | Bảng đầy đủ: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (cả 2 workflow); `VM_HOST`, `VM_USER`, `VM_SSH_KEY`, `VM_PORT` (chỉ prod/deploy). Mỗi dòng: tên + ý nghĩa + giá trị mẫu. | Trích đúng tên secret từ `deploy.yml` + `sit.yml`. |
| 4.3 | Tạo SSH key cho deploy | Hướng dẫn `ssh-keygen`, thêm public key vào `~/.ssh/authorized_keys` trên VM, dán private key vào `VM_SSH_KEY`. | Chỉ cần cho production. |
| 4.4 | Kiểm tra workflow trigger | Giải thích push `main` → chạy `deploy.yml`; push `dev` → chạy `sit.yml`; cả 2 có `workflow_dispatch` (chạy tay từ tab Actions). | |
| 5 | Cấu hình file môi trường (.env & config.yaml) | Hướng dẫn dựng file cấu hình cho từng môi trường. | |
| 5.1 | Tổng quan các file env | Bảng: `.env` (prod), `.env.sit` (SIT), `.env.dev` (dev), `.env.example` (mẫu để copy). Giải thích quan hệ `--env-file`. | |
| 5.2 | Các biến quan trọng phải set | Bảng giải thích nhóm biến: vendor key (`OPENAI_API_KEY`), version image (`*_VERSION`), port (`HOST_PORT`, `WREN_ENGINE_PORT`...), `WREN_INTERNAL_API_SECRET` (bắt buộc khi bật auth), `GENERATION_MODEL`, telemetry/langfuse. | Trích từ `.env.example`. |
| 5.3 | Khác biệt env giữa prod / sit / dev | Nêu: prod dùng SQLite; sit/dev hỗ trợ PostgreSQL (`DB_TYPE`, `PG_URL`, `PG_SSL_REJECT_UNAUTHORIZED`); dev có `WREN_UI_ENDPOINT` callback. | Đối chiếu 3 file compose (mục 8.2.5 sad.md). |
| 5.4 | Cấu hình AI service (config.yaml) | Copy `config.example.yaml` → `config.yaml`; trỏ tới LLM/embedder; link tới `wren-ai-service/docs/configuration.md` cho chi tiết. | Không lặp lại toàn bộ; chỉ nêu bước tối thiểu. |
| 6 | Chạy môi trường Development | Hướng dẫn dev: build & chạy tại máy. | |
| 6.1 | Vai trò môi trường dev | Brief: phát triển & test thay đổi cục bộ trước khi đẩy lên `dev`/`main`; image build tại chỗ (`*:local`), không qua CI. | |
| 6.2 | Các bước chạy | `cd docker` → chuẩn bị `.env.dev` + `config.yaml` → `docker compose --env-file .env.dev -f docker-compose.dev.yaml up -d --build`. | Nhấn mạnh cờ `--build`. |
| 6.3 | Đặc thù dev | Qdrant có healthcheck (dev chờ healthy mới start); ibis-server `LOG_LEVEL=DEBUG`; cổng engine/ibis expose ra host để debug. | Từ `docker-compose.dev.yaml`. |
| 6.4 | Kiểm tra & truy cập | Mở `http://localhost:<HOST_PORT>`; cách xem log (`docker compose ... logs -f <service>`); rebuild 1 service. | |
| 7 | Chạy môi trường SIT | Hướng dẫn SIT: CI build, máy local tự pull & up. | |
| 7.1 | Vai trò môi trường SIT | Brief: kiểm thử tích hợp (System Integration Test); image tag `:sit` build sẵn bởi CI; tester chủ động pull khi cần. | |
| 7.2 | Phía CI (tự động) | Push lên nhánh `dev` → `sit.yml` build & push image `:sit` lên Docker Hub (không deploy). | |
| 7.3 | Phía máy chạy SIT (thủ công) | `docker compose --env-file .env.sit -f docker-compose.sit.yaml pull` → `up -d`. | |
| 7.4 | Đặc thù SIT | Hỗ trợ PostgreSQL qua `PG_URL`; mount thư mục `migrations` để chạy migrate; cách chạy migration nếu cần. | Từ `docker-compose.sit.yaml`. |
| 8 | Chạy & triển khai môi trường Production | Hướng dẫn prod: CI build + tự deploy qua SSH. | |
| 8.1 | Vai trò môi trường production | Brief: môi trường chạy thật cho người dùng cuối; triển khai tự động hoàn toàn từ nhánh `main`. | |
| 8.2 | Chuẩn bị VM server | Cài Docker trên VM; tạo thư mục `/workspace/wren-ai` (clone repo); đặt sẵn `.env` + `config.yaml` trong `docker/`. | Đường dẫn khớp script trong `deploy.yml`. |
| 8.3 | Luồng deploy tự động | Push `main` → `deploy.yml`: build 4 service → push `:latest` → SSH vào VM → `git pull` → `compose pull` → `up -d` → `prune`. | Có thể chèn lại sơ đồ 8.2.2 của sad.md. |
| 8.4 | Triển khai/cập nhật thủ công | Cách SSH vào VM tự chạy lại chuỗi lệnh `pull`/`up -d` khi cần rollback hoặc deploy tay. | |
| 8.5 | Lưu ý image wren-engine (Java) | Giải thích prod/sit dùng image upstream `ghcr.io/canner/wren-engine:0.22.0` cho engine Java (fallback); lõi Rust `wren-core` build chung ibis-server. | Đối chiếu ghi chú mục 8.2.5 sad.md. |
| 9 | Kiểm tra sau khi chạy (Verification) | Xác nhận hệ thống chạy đúng. | |
| 9.1 | Health check các service | Kiểm tra container `up` (`docker compose ps`); ibis-server `/health`; truy cập UI; thử 1 câu hỏi end-to-end. | |
| 9.2 | Vị trí log & dữ liệu | Volume `data` chia sẻ; cách xem log từng service; vị trí SQLite/PG. | |
| 10 | Xử lý sự cố thường gặp (Troubleshooting) | Bảng lỗi → nguyên nhân → cách xử lý. | |
| 10.1 | Lỗi cấu hình & secret | Sai/thiếu secret CI; quên đổi Docker Hub username; thiếu `WREN_INTERNAL_API_SECRET` khi bật auth (gây 401). | |
| 10.2 | Lỗi cổng & tài nguyên | Trùng cổng `HOST_PORT`; Qdrant chưa healthy; image pull thất bại (sai tag/quyền). | |
| 10.3 | Lỗi deploy production | SSH thất bại (sai key/host/port); `git pull` conflict trên VM; image cũ chưa được prune. | |
| 11 | Phụ lục | Tham chiếu nhanh. | |
| 11.1 | Bảng tổng hợp lệnh theo môi trường | 3 dòng lệnh up/down/logs cho prod/sit/dev cạnh nhau. | Tiện copy-paste. |
| 11.2 | Bảng tổng hợp secret & env | Checklist tất cả secret GitHub + biến env bắt buộc. | |
