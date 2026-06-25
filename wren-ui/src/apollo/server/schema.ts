import { gql } from 'apollo-server-micro';

export const typeDefs = gql`
  """
  Arbitrary JSON value. Used for flexible payloads such as data source connection properties,
  chart schemas, and preview query results where the shape varies by context.
  """
  scalar JSON

  """
  A SQL string written in the dialect of the connected data source (e.g. BigQuery SQL, T-SQL).
  Distinct from plain String so resolvers can validate or transform dialect-specific syntax.
  """
  scalar DialectSQL

  """
  Identifies which public BFF API endpoint was called. Used in API history logs to categorise
  and filter requests by operation type.
  """
  enum ApiType {
    "Natural-language question → SQL generation (non-streaming)"
    GENERATE_SQL
    "Execute a raw SQL string against the data source"
    RUN_SQL
    "Generate a Vega-Lite chart spec from query results"
    GENERATE_VEGA_CHART
    "Generate a natural-language summary of query results"
    GENERATE_SUMMARY
    "Single-turn ask: resolve a question end-to-end"
    ASK
    "Retrieve the project's saved instructions list"
    GET_INSTRUCTIONS
    "Persist a new instruction"
    CREATE_INSTRUCTION
    "Update an existing instruction"
    UPDATE_INSTRUCTION
    "Remove an instruction"
    DELETE_INSTRUCTION
    "Add a new SQL-pair (question↔SQL example)"
    CREATE_SQL_PAIR
    "Modify an existing SQL-pair"
    UPDATE_SQL_PAIR
    "Remove a SQL-pair"
    DELETE_SQL_PAIR
    "List all saved SQL-pairs"
    GET_SQL_PAIRS
    "List all published data models"
    GET_MODELS
    "Streaming version of the ASK endpoint (SSE)"
    STREAM_ASK
    "Streaming version of GENERATE_SQL"
    STREAM_GENERATE_SQL
    "Chat-mode: send a question and get an answer"
    CHAT_ASK
    "Chat-mode: poll the result of a task"
    CHAT_TASK_RESULT
    "Chat-mode: create a new conversation thread"
    CHAT_CREATE_THREAD
    "Chat-mode: add a response to an existing thread"
    CHAT_THREAD_RESPONSE
    "Chat-mode: preview tabular data for a response"
    CHAT_PREVIEW_DATA
    "Chat-mode: request an adjustment to a response's SQL"
    CHAT_ADJUST
    "Chat-mode: poll the result of an adjustment task"
    CHAT_ADJUSTMENT_RESULT
    "Chat-mode: generate a step-by-step SQL breakdown"
    CHAT_BREAKDOWN
    "Chat-mode: generate a natural-language answer from data"
    CHAT_ANSWER
  }

  """
  Filters for querying the API history log. All fields are optional and combined with AND logic.
  """
  input ApiHistoryFilterInput {
    "Filter by API operation type"
    apiType: ApiType
    "Filter by HTTP status code (e.g. 200, 400, 500)"
    statusCode: Int
    "Filter by conversation thread ID"
    threadId: String
    "Filter by the internal numeric user ID"
    userId: Int
    "Filter by project ID"
    projectId: Int
    "Return only records created on or after this ISO-8601 date string"
    startDate: String
    "Return only records created on or before this ISO-8601 date string"
    endDate: String
  }

  """
  Cursor-based pagination parameters for the API history query.
  """
  input ApiHistoryPaginationInput {
    "Number of records to skip (0-based offset)"
    offset: Int!
    "Maximum number of records to return in one page"
    limit: Int!
  }

  """
  A single API audit-log entry capturing the full request/response lifecycle for one BFF call.
  Useful for debugging, usage analysis, and billing attribution.
  """
  type ApiHistoryResponse {
    "Unique identifier for this log entry (UUID)"
    id: String!
    "The project this API call was scoped to"
    projectId: Int!
    "Which BFF operation was invoked"
    apiType: ApiType!
    "The conversation thread this call belongs to, if any"
    threadId: String
    "Internal numeric ID of the authenticated user who made the call"
    userId: Int
    "Email address of the authenticated user, denormalised for quick display"
    userEmail: String
    "HTTP request headers (sanitised — authorization values are redacted)"
    headers: JSON
    "The full request body sent to the BFF"
    requestPayload: JSON
    "The full response body returned by the BFF"
    responsePayload: JSON
    "HTTP status code of the response"
    statusCode: Int
    "End-to-end latency of the BFF call in milliseconds"
    durationMs: Int
    "ISO-8601 timestamp when the log entry was created"
    createdAt: String!
    "ISO-8601 timestamp when the log entry was last updated"
    updatedAt: String!
  }

  """
  Paginated wrapper around a list of API history entries. Use hasMore to determine
  whether additional pages exist.
  """
  type ApiHistoryPaginatedResponse {
    "The current page of API history records"
    items: [ApiHistoryResponse!]!
    "Total number of records matching the applied filters"
    total: Int!
    "True if there are more records beyond the current page"
    hasMore: Boolean!
  }

  """
  Supported data source (database / data warehouse) types that WrenAI can connect to.
  """
  enum DataSourceName {
    "Amazon Athena (query S3 data via Presto SQL)"
    ATHENA
    "Google BigQuery"
    BIG_QUERY
    "DuckDB (embedded analytical database, used for local / file-based sources)"
    DUCKDB
    "PostgreSQL"
    POSTGRES
    "MySQL"
    MYSQL
    "Oracle Database"
    ORACLE
    "Microsoft SQL Server"
    MSSQL
    "ClickHouse (columnar OLAP database)"
    CLICK_HOUSE
    "Trino (distributed SQL query engine)"
    TRINO
    "Snowflake"
    SNOWFLAKE
    "Amazon Redshift"
    REDSHIFT
    "Databricks (Delta Lake / Spark SQL)"
    DATABRICKS
  }

  """
  Authentication method used when connecting to Amazon Redshift.
  """
  enum RedshiftConnectionType {
    "Standard username/password authentication"
    redshift
    "IAM-based authentication (uses AWS credentials instead of a password)"
    redshift_iam
  }

  """
  Authentication method used when connecting to Databricks.
  """
  enum DatabricksConnectionType {
    "Personal access token authentication"
    token
    "Service principal (OAuth M2M) authentication"
    service_principal
  }

  """
  Aggregation and mathematical functions available when building a calculated field.
  Each value maps to the corresponding function supported by the underlying query engine.
  """
  enum ExpressionName {
    "Absolute value |x|"
    ABS
    "Arithmetic mean of a column"
    AVG
    "Count of non-null values"
    COUNT
    "Count of rows where a condition is true"
    COUNT_IF
    "Maximum value in a column"
    MAX
    "Minimum value in a column"
    MIN
    "Sum of all values in a column"
    SUM
    "Cube root ∛x"
    CBRT
    "Round up to nearest integer"
    CEIL
    "Alias for CEIL"
    CEILING
    "Exponential e^x"
    EXP
    "Round down to nearest integer"
    FLOOR
    "Natural logarithm ln(x)"
    LN
    "Base-10 logarithm log₁₀(x)"
    LOG10
    "Round to a specified number of decimal places"
    ROUND
    "Sign of a number: -1, 0, or 1"
    SIGN
    "Character length of a string"
    LENGTH
    "Reverse the characters of a string"
    REVERSE
  }

  """
  Built-in sample datasets that can be loaded without connecting an external data source.
  Useful for onboarding, demos, and testing.
  """
  enum SampleDatasetName {
    "HR dataset: employees, departments, salaries"
    HR
    "E-commerce dataset: orders, products, customers"
    ECOMMERCE
    "NBA basketball statistics dataset"
    NBA
    "Music streaming dataset: tracks, artists, plays"
    MUSIC
  }

  """
  Deployment sync state between the in-memory WrenMDL model and the AI service's
  vector store. Changes to the data model require a redeploy to become queryable.
  """
  enum SyncStatus {
    "A deployment is currently in progress"
    IN_PROGRESS
    "The deployed model matches the current model definition — the AI can query it"
    SYNCRONIZED
    "The model has been changed since the last deploy — queries may use stale data"
    UNSYNCRONIZED
  }

  """
  Categories of schema drift detected between the saved data model and the live
  data source. Reported by the schemaChange query so users know what to resolve.
  """
  enum SchemaChangeType {
    "Tables that exist in the model but have been dropped from the data source"
    DELETED_TABLES
    "Columns that exist in the model but have been removed from their table"
    DELETED_COLUMNS
    "Columns whose data type has changed in the data source"
    MODIFIED_COLUMNS
  }

  """
  Language used for the project's AI-generated responses and suggested questions.
  Changing the language affects all AI output for the project.
  """
  enum ProjectLanguage {
    "English"
    EN
    "Spanish (Español)"
    ES
    "French (Français)"
    FR
    "Traditional Chinese (繁體中文)"
    ZH_TW
    "Simplified Chinese (简体中文)"
    ZH_CN
    "German (Deutsch)"
    DE
    "Portuguese (Português)"
    PT
    "Russian (Русский)"
    RU
    "Japanese (日本語)"
    JA
    "Korean (한국어)"
    KO
    "Italian (Italiano)"
    IT
    "Persian / Farsi (فارسی)"
    FA_IR
    "Arabic (العربية)"
    AR
    "Dutch (Nederlands)"
    NL
    "Azerbaijani (Azərbaycan dili)"
    AZ_AZ
    "Turkish (Türkçe)"
    TR
  }

  """
  The currently connected data source for a project.
  """
  type DataSource {
    "The type of database or data warehouse"
    type: DataSourceName!
    "Connection properties specific to the data source type (host, credentials, etc.)"
    properties: JSON!
    "If this project was initialised from a built-in sample dataset, the dataset name is stored here"
    sampleDataset: SampleDatasetName
  }

  """
  A simple numeric ID filter used by mutations that operate on a single record by its primary key.
  """
  input WhereIdInput {
    "The integer primary key of the target record"
    id: Int!
  }

  """
  Connection details for a new or updated data source.
  """
  input DataSourceInput {
    "The database / warehouse type to connect"
    type: DataSourceName!
    "Type-specific connection properties (host, port, credentials, project ID, etc.)"
    properties: JSON!
  }

  """
  Selects which built-in sample dataset to load when a user wants to explore WrenAI
  without connecting their own data source.
  """
  input SampleDatasetInput {
    "The sample dataset to load into the project"
    name: SampleDatasetName!
  }

  """
  Lightweight representation of a database table used during onboarding, before a full
  data model has been created.
  """
  type CompactTable {
    "The table name as it appears in the data source"
    name: String!
    "The columns available in this table"
    columns: [CompactColumn!]!
    "Additional metadata properties attached to the table (e.g. row count, tags)"
    properties: JSON
  }

  """
  Input for selecting which columns to include when submitting a model definition
  during the MDL (Model Definition Language) import flow.
  """
  input MDLModelSubmitInput {
    "The model name (maps to a table or view in the data source)"
    name: String!
    "The column names to include in the model"
    columns: [String!]!
  }

  """
  Cardinality of a join relationship between two data models.
  """
  enum RelationType {
    "Each row in Model A matches at most one row in Model B, and vice versa"
    ONE_TO_ONE
    "Each row in Model A can match many rows in Model B"
    ONE_TO_MANY
    "Many rows in Model A can match one row in Model B"
    MANY_TO_ONE
  }

  """
  Tracks how far a user has progressed through the initial project setup wizard.
  """
  enum OnboardingStatus {
    "The user has not yet started the setup wizard"
    NOT_STARTED
    "The data source connection has been saved but tables/models have not been selected yet"
    DATASOURCE_SAVED
    "The full onboarding flow (data source + tables + relations + deploy) is complete"
    ONBOARDING_FINISHED
    "The project was initialised using a built-in sample dataset (setup is complete)"
    WITH_SAMPLE_DATASET
  }

  """
  Identifies the kind of node displayed in the data model diagram.
  """
  enum NodeType {
    "A data model (backed by a source table or SQL)"
    MODEL
    "A metric definition (aggregation over a model)"
    METRIC
    "A saved SQL view"
    VIEW
    "A join relationship between two models"
    RELATION
    "A regular column from a source table"
    FIELD
    "A column derived from an expression (e.g. SUM, COUNT)"
    CALCULATED_FIELD
  }

  """
  A fully resolved join relationship between two data models, including the model and
  column names on both sides of the join.
  """
  type Relation {
    "ID of the model on the left (from) side of the join"
    fromModelId: Int!
    "Reference name of the model on the left side"
    fromModelReferenceName: String!
    "ID of the join column on the left side"
    fromColumnId: Int!
    "Reference name of the join column on the left side"
    fromColumnReferenceName: String!
    "ID of the model on the right (to) side of the join"
    toModelId: Int!
    "Reference name of the model on the right side"
    toModelReferenceName: String!
    "ID of the join column on the right side"
    toColumnId: Int!
    "Reference name of the join column on the right side"
    toColumnReferenceName: String!
    "Cardinality of the join"
    type: RelationType!
    "Human-readable name for this relationship"
    name: String!
  }

  """
  AI-suggested relationships for a single model. The UI presents these to the user
  so they can confirm or discard each recommended join during onboarding or model editing.
  """
  type RecommendRelations {
    "The model ID these recommendations apply to"
    id: Int!
    "User-facing display name of the model"
    displayName: String!
    "Internal reference name used in queries"
    referenceName: String!
    "List of recommended join relationships for this model"
    relations: [Relation]!
  }

  """
  Input for creating a new join relationship between two models.
  """
  input RelationInput {
    "ID of the model on the left (from) side of the join"
    fromModelId: Int!
    "ID of the join column on the left side"
    fromColumnId: Int!
    "ID of the model on the right (to) side of the join"
    toModelId: Int!
    "ID of the join column on the right side"
    toColumnId: Int!
    "Cardinality of the join"
    type: RelationType!
  }

  """
  Input for changing the cardinality of an existing relationship.
  """
  input UpdateRelationInput {
    "The new cardinality type for the relationship"
    type: RelationType!
  }

  """
  Batch input for saving multiple relationships at once (used at the end of the
  onboarding wizard's relationship-selection step).
  """
  input SaveRelationInput {
    "The full list of relationships to persist; existing relationships not in this list are deleted"
    relations: [RelationInput]!
  }

  """
  Input for selecting which source tables to include in the project's data model.
  Called during onboarding after the user has browsed the available tables.
  """
  input SaveTablesInput {
    "Source table names (exactly as they appear in the data source) to include"
    tables: [String!]!
  }

  """
  Lightweight column descriptor returned during onboarding or wherever the full
  column detail is not needed.
  """
  type CompactColumn {
    "Column name as it appears in the data source"
    name: String!
    "SQL data type of the column (e.g. VARCHAR, INTEGER, TIMESTAMP)"
    type: String!
    "Additional metadata properties (e.g. nullable flag, sample values)"
    properties: JSON
  }

  """
  Input for a simple custom expression field (used internally during metric creation).
  """
  input CustomFieldInput {
    "Field name"
    name: String!
    "Raw SQL expression"
    expression: String!
  }

  """
  Input for defining a calculated field via a free-form SQL expression and column lineage.
  """
  input CalculatedFieldInput {
    "Display name for the calculated field"
    name: String!
    "SQL expression that computes the field value"
    expression: String!
    "Ordered list of column IDs whose values feed into this expression"
    lineage: [Int!]!
    "Optional diagram/visual representation of the expression tree"
    diagram: JSON
  }

  """
  Input for creating a new data model from a source table.
  """
  input CreateModelInput {
    "The fully-qualified source table name (schema.table or database.schema.table)"
    sourceTableName: String!
    "The column names from the source table to expose in this model"
    fields: [String!]!
    "Optional primary key column name; used to generate join suggestions"
    primaryKey: String
  }

  """
  Input for creating a calculated field on an existing model.
  """
  input CreateCalculatedFieldInput {
    "The model to add the calculated field to"
    modelId: Int!
    "Display name for the new calculated field"
    name: String!
    "The aggregation or math function to apply"
    expression: ExpressionName!
    "Ordered list of column IDs used as input to the expression"
    lineage: [Int!]!
  }

  """
  Input for modifying an existing calculated field's formula.
  """
  input UpdateCalculatedFieldInput {
    "New display name for the calculated field"
    name: String!
    "New aggregation or math function"
    expression: ExpressionName!
    "New ordered list of column IDs used as input to the expression"
    lineage: [Int!]!
  }

  """
  Identifies which calculated field to update.
  """
  input UpdateCalculatedFieldWhere {
    "Primary key of the calculated field record"
    id: Int!
  }

  """
  Input for validating a calculated field name before saving it.
  Used to check for naming conflicts within a model.
  """
  input ValidateCalculatedFieldInput {
    "Proposed name for the calculated field"
    name: String!
    "The model to validate against"
    modelId: Int!
    "If editing an existing field, its ID so we can exclude it from the duplicate check"
    columnId: Int
  }

  """
  Result of a calculated field name validation check.
  """
  type CalculatedFieldValidationResponse {
    "True if the name is valid and not already taken within the model"
    valid: Boolean!
    "Human-readable explanation when valid is false"
    message: String
  }

  """
  Filter for selecting a model by its primary key.
  """
  input ModelWhereInput {
    "Primary key of the model record"
    id: Int!
  }

  """
  Input for updating which columns are exposed by a model, and optionally its primary key.
  """
  input UpdateModelInput {
    "The updated set of column names to expose (replaces the existing set)"
    fields: [String!]!
    "Updated primary key column name; omit to leave unchanged"
    primaryKey: String
  }

  """
  Input for updating the display name or description of a nested (struct/array element) column.
  """
  input UpdateNestedColumnMetadataInput {
    "Primary key of the nested column record"
    id: Int!
    "New user-facing display name"
    displayName: String
    "New description shown to the AI and in the UI"
    description: String
  }

  """
  Input for updating the display name or description of a regular model column.
  """
  input UpdateColumnMetadataInput {
    "Primary key of the column record"
    id: Int!
    "New user-facing display name"
    displayName: String
    "New description shown to the AI and in the UI"
    description: String
  }

  """
  Input for updating the description of a calculated field.
  """
  input UpdateCalculatedFieldMetadataInput {
    "Primary key of the calculated field record"
    id: Int!
    "New description shown to the AI and in the UI"
    description: String
  }

  """
  Input for updating the description of a relationship (join).
  """
  input UpdateRelationshipMetadataInput {
    "Primary key of the relationship record"
    id: Int!
    "New description that explains the business meaning of this join"
    description: String
  }

  """
  Input for updating the description of a view column.
  View columns are identified by referenceName since they have no surrogate ID.
  """
  input UpdateViewColumnMetadataInput {
    "Reference name of the view column (matches the SQL alias)"
    referenceName: String!
    "New description shown to the AI and in the UI"
    description: String
  }

  """
  Batch input for updating all metadata (display names, descriptions) for a data model.
  Only the fields provided will be updated; omitted fields remain unchanged.
  """
  input UpdateModelMetadataInput {
    "New user-facing display name for the model (alias shown in the UI)"
    displayName: String
    "Business description of what this model represents; fed to the AI for better SQL generation"
    description: String
    "Metadata updates for regular columns"
    columns: [UpdateColumnMetadataInput!]
    "Metadata updates for nested (struct/array) columns"
    nestedColumns: [UpdateNestedColumnMetadataInput!]
    "Metadata updates for calculated fields"
    calculatedFields: [UpdateCalculatedFieldMetadataInput!]
    "Metadata updates for join relationships"
    relationships: [UpdateRelationshipMetadataInput!]
  }

  """
  Batch input for updating the display name, description, and column descriptions of a view.
  """
  input UpdateViewMetadataInput {
    "New user-facing display name for the view"
    displayName: String
    "Business description of what this view represents"
    description: String
    "Metadata updates for the view's output columns"
    columns: [UpdateViewColumnMetadataInput!]
  }

  """
  Detailed info for a nested column (a field inside a STRUCT or ARRAY column).
  """
  type NestedFieldInfo {
    "Primary key of the nested column record"
    id: Int!
    "User-facing display name"
    displayName: String!
    "Internal reference name used in SQL and the AI context"
    referenceName: String!
    "The column name as it appears in the data source"
    sourceColumnName: String!
    "Path from the root column to this nested field (e.g. ['address', 'city'])"
    columnPath: [String!]!
    "SQL data type of the nested field"
    type: String!
    "Additional metadata properties"
    properties: JSON!
  }

  """
  Detailed info for a model field (regular or calculated column) returned by the
  listModels and model queries.
  """
  type FieldInfo {
    "Primary key of the column or calculated field record"
    id: Int!
    "User-facing display name"
    displayName: String!
    "Internal reference name used in SQL and the AI context"
    referenceName: String!
    "The column name as it appears in the data source (null for calculated fields)"
    sourceColumnName: String!
    "SQL data type (null for some calculated fields until deployed)"
    type: String
    "True if this field is derived via a formula rather than mapped directly from source"
    isCalculated: Boolean!
    "True if the column has a NOT NULL constraint in the data source"
    notNull: Boolean!
    "The SQL expression for calculated fields"
    expression: String
    "Additional metadata properties"
    properties: JSON
    "Nested columns for STRUCT/ARRAY type fields"
    nestedColumns: [NestedFieldInfo!]
  }

  """
  Summary information about a data model used in the model list view.
  Contains column lists but not the full join relationship graph.
  """
  type ModelInfo {
    "Primary key of the model record"
    id: Int!
    "User-facing display name"
    displayName: String!
    "Internal reference name used in SQL queries and the AI context"
    referenceName: String!
    "The source table or view this model is backed by"
    sourceTableName: String!
    "Custom SQL override (if the model is defined by a SQL expression rather than a table)"
    refSql: String
    "The primary key column name, used for join suggestions"
    primaryKey: String
    "True if this model's query results are cached for faster repeated access"
    cached: Boolean!
    "How often the cache is refreshed (e.g. '1h', '24h')"
    refreshTime: String
    "Business description of what this model represents"
    description: String
    "Regular source columns exposed by this model"
    fields: [FieldInfo]!
    "Calculated (derived) columns defined on this model"
    calculatedFields: [FieldInfo]!
    "Additional metadata properties"
    properties: JSON
  }

  """
  Detailed nested column info returned by the model detail query.
  """
  type DetailedNestedColumn {
    "Primary key of the nested column record"
    id: Int!
    "User-facing display name"
    displayName: String!
    "Internal reference name"
    referenceName: String!
    "Source column name"
    sourceColumnName: String!
    "Path from the root column to this nested field"
    columnPath: [String!]!
    "SQL data type"
    type: String
    "Additional metadata properties"
    properties: JSON
  }

  """
  Full column descriptor returned by the model detail query.
  """
  type DetailedColumn {
    "User-facing display name"
    displayName: String!
    "Internal reference name used in SQL and the AI context"
    referenceName: String!
    "Column name as it appears in the data source"
    sourceColumnName: String!
    "SQL data type"
    type: String
    "True if this column is derived from a formula"
    isCalculated: Boolean!
    "True if the column has a NOT NULL constraint"
    notNull: Boolean!
    "Additional metadata properties"
    properties: JSON!
    "Nested columns for STRUCT/ARRAY type columns"
    nestedColumns: [DetailedNestedColumn!]
  }

  """
  Full relationship descriptor returned by the model detail query.
  """
  type DetailedRelation {
    "ID of the model on the from side of the join"
    fromModelId: Int!
    "ID of the join column on the from side"
    fromColumnId: Int!
    "ID of the model on the to side of the join"
    toModelId: Int!
    "ID of the join column on the to side"
    toColumnId: Int!
    "Cardinality of the join"
    type: RelationType!
    "Human-readable relationship name"
    name: String!
    "Additional metadata properties"
    properties: JSON!
  }

  """
  Full detail of a single data model, including all columns and join relationships.
  Returned by the model(where:) query.
  """
  type DetailedModel {
    "User-facing display name"
    displayName: String!
    "Internal reference name used in SQL and the AI context"
    referenceName: String!
    "The source table or view this model is backed by"
    sourceTableName: String!
    "Custom SQL override for models defined by an expression"
    refSql: String!
    "Primary key column name"
    primaryKey: String
    "True if this model's results are cached"
    cached: Boolean!
    "Cache refresh interval"
    refreshTime: String
    "Business description"
    description: String
    "Regular source columns"
    fields: [DetailedColumn]
    "Calculated (derived) columns"
    calculatedFields: [DetailedColumn]
    "Join relationships to other models"
    relations: [DetailedRelation]
    "Additional metadata properties"
    properties: JSON!
  }

  """
  Lightweight descriptor of a saved SQL view. Views expose a named SQL query as a
  reusable data source within the project.
  """
  type ViewInfo {
    "Primary key of the view record"
    id: Int!
    "The view name (used as a SQL alias)"
    name: String!
    "The SQL SELECT statement that defines this view"
    statement: String!
    "User-facing display name"
    displayName: String!
  }

  """
  Filter for selecting a view by its primary key.
  """
  input ViewWhereUniqueInput {
    "Primary key of the view record"
    id: Int!
  }

  """
  Input for fetching a preview of the data returned by a view.
  """
  input PreviewViewDataInput {
    "Primary key of the view to preview"
    id: Int!
    "Maximum rows to return; defaults to 500 if omitted"
    limit: Int
  }

  """
  Input for saving a new SQL view. The view is created from an existing thread response
  so the SQL is already known and validated.
  """
  input CreateViewInput {
    "The view name (must be unique within the project)"
    name: String!
    "ID of the thread response whose SQL will back this view"
    responseId: Int!
    "A rephrased version of the original question, used as the view's display name"
    rephrasedQuestion: String!
  }

  """
  Input for checking whether a view name is already in use.
  """
  input ValidateViewInput {
    "The view name to validate"
    name: String!
  }

  """
  Result of a view name validation check.
  """
  type ViewValidationResponse {
    "True if the name is available and valid"
    valid: Boolean!
    "Human-readable explanation when valid is false"
    message: String
  }

  """
  Current onboarding progress for the active project.
  """
  type OnboardingStatusResponse {
    "The stage the user is currently at in the setup wizard"
    status: OnboardingStatus
  }

  """
  Reports whether the live AI service is using the latest published data model.
  """
  type ModelSyncResponse {
    "Current synchronisation state between the UI's model and the AI service"
    status: SyncStatus!
  }

  """
  The full data model diagram, containing all models and views in the project.
  Rendered as an entity-relationship (ER) diagram in the UI.
  """
  type Diagram {
    "All data models in the project"
    models: [DiagramModel]!
    "All saved SQL views in the project"
    views: [DiagramView]!
  }

  """
  A view node in the data model diagram.
  """
  type DiagramView {
    "Unique diagram node ID (not the database primary key)"
    id: String!
    "Database primary key of the underlying view record"
    viewId: Int!
    "Always VIEW for this type"
    nodeType: NodeType!
    "The SQL SELECT statement that defines this view"
    statement: String!
    "User-facing display name"
    displayName: String!
    "Internal reference name"
    referenceName: String!
    "Output columns of the view"
    fields: [DiagramViewField]!
    "Business description of the view"
    description: String
  }

  """
  A column shown inside a view node in the data model diagram.
  """
  type DiagramViewField {
    "Unique diagram node ID"
    id: String!
    "User-facing display name"
    displayName: String!
    "Internal reference name (SQL alias)"
    referenceName: String!
    "SQL data type"
    type: String!
    "Always FIELD for view columns"
    nodeType: NodeType!
    "Business description of this column"
    description: String
  }

  """
  A model node in the data model diagram, containing all its fields and relationships.
  """
  type DiagramModel {
    "Unique diagram node ID"
    id: String!
    "Database primary key of the underlying model record"
    modelId: Int!
    "Always MODEL for this type"
    nodeType: NodeType!
    "User-facing display name"
    displayName: String!
    "Internal reference name"
    referenceName: String!
    "The source table or view backing this model"
    sourceTableName: String!
    "Custom SQL override (if the model is expression-based)"
    refSql: String
    "True if this model's results are cached"
    cached: Boolean!
    "Cache refresh interval"
    refreshTime: String
    "Business description of the model"
    description: String
    "Regular source columns"
    fields: [DiagramModelField]!
    "Calculated (derived) columns"
    calculatedFields: [DiagramModelField]!
    "Join relationships to other models, shown as edges in the diagram"
    relationFields: [DiagramModelRelationField]!
  }

  """
  A nested column shown inside a field node in the diagram (for STRUCT/ARRAY types).
  """
  type DiagramModelNestedField {
    "Unique diagram node ID"
    id: String!
    "Primary key of the nested column record"
    nestedColumnId: Int!
    "User-facing display name"
    displayName: String!
    "Internal reference name"
    referenceName: String!
    "Path from the root column to this nested field"
    columnPath: [String!]!
    "SQL data type"
    type: String!
    "Business description"
    description: String
  }

  """
  A field (column) node inside a model in the data model diagram.
  Covers both regular source columns and calculated fields.
  """
  type DiagramModelField {
    "Unique diagram node ID"
    id: String!
    "Primary key of the column or calculated field record"
    columnId: Int!
    "FIELD or CALCULATED_FIELD"
    nodeType: NodeType!
    "SQL data type"
    type: String!
    "User-facing display name"
    displayName: String!
    "Internal reference name"
    referenceName: String!
    "Business description of this field"
    description: String
    "True if this column is the model's primary key"
    isPrimaryKey: Boolean!
    "SQL expression for calculated fields"
    expression: String
    "Aggregation function name for calculated fields"
    aggregation: String
    "Ordered column ID chain used to build the calculated field expression"
    lineage: [Int!]
    "Nested fields for STRUCT/ARRAY type columns"
    nestedFields: [DiagramModelNestedField!]
  }

  """
  A relationship edge shown in the data model diagram. Contains the full detail of
  both sides of the join so the UI can draw the connection without extra lookups.
  """
  type DiagramModelRelationField {
    "Unique diagram node ID"
    id: String!
    "Primary key of the relationship record"
    relationId: Int!
    "Always RELATION"
    nodeType: NodeType!
    "Cardinality of the join"
    type: RelationType!
    "Human-readable display name"
    displayName: String!
    "Internal reference name"
    referenceName: String!
    "Business description of this relationship"
    description: String
    "ID of the model on the from side"
    fromModelId: Int!
    "Reference name of the from-side model"
    fromModelName: String!
    "Display name of the from-side model"
    fromModelDisplayName: String!
    "ID of the join column on the from side"
    fromColumnId: Int!
    "Reference name of the from-side join column"
    fromColumnName: String!
    "Display name of the from-side join column"
    fromColumnDisplayName: String!
    "ID of the model on the to side"
    toModelId: Int!
    "Reference name of the to-side model"
    toModelName: String!
    "Display name of the to-side model"
    toModelDisplayName: String!
    "ID of the join column on the to side"
    toColumnId: Int!
    "Reference name of the to-side join column"
    toColumnName: String!
    "Display name of the to-side join column"
    toColumnDisplayName: String!
  }

  """
  Input for a simple measure used when creating a metric (numeric aggregation).
  """
  input SimpleMeasureInput {
    "Measure name"
    name: String!
    "SQL data type of the measure"
    type: String!
    "True if this measure is derived from an expression"
    isCalculated: Boolean!
    "True if the measure cannot be null"
    notNull: Boolean!
    "Additional properties"
    properties: JSON!
  }

  """
  Input for a dimension (grouping attribute) in a metric definition.
  """
  input DimensionInput {
    "Dimension name"
    name: String!
    "SQL data type"
    type: String!
    "True if derived from an expression"
    isCalculated: Boolean!
    "True if cannot be null"
    notNull: Boolean!
    "Additional properties"
    properties: JSON!
  }

  """
  Input for a time grain (date part grouping) in a metric definition.
  """
  input TimeGrainInput {
    "Time grain name (e.g. 'day', 'month', 'year')"
    name: String!
    "The date/timestamp column to apply the grain to"
    refColumn: String!
    "Which date parts to expose (e.g. ['YEAR', 'MONTH', 'DAY'])"
    dateParts: [String!]!
  }

  """
  Input for creating a simple metric (a pre-aggregated measure with dimensions and time grains).
  """
  input CreateSimpleMetricInput {
    "Metric name (unique within the project)"
    name: String!
    "User-facing display name"
    displayName: String!
    "Business description of what this metric measures"
    description: String
    "True if the metric's results should be cached"
    cached: Boolean!
    "Cache refresh interval (e.g. '1h')"
    refreshTime: String
    "The backing model name"
    model: String!
    "Additional properties"
    properties: JSON!
    "The numeric measures this metric computes"
    measure: [SimpleMeasureInput!]!
    "The dimensions (grouping attributes) available for this metric"
    dimension: [DimensionInput!]!
    "The time grains available for trend analysis"
    timeGrain: [TimeGrainInput!]!
  }

  """
  A handle to an asynchronous background task. Poll the relevant query
  (askingTask, adjustmentTask, etc.) with this ID to check progress.
  """
  type Task {
    "Unique task identifier; pass this to the corresponding polling query"
    id: String!
  }

  """
  Structured error returned inside task results and thread responses.
  Never sent as a top-level GraphQL error — always embedded in the parent type
  so that partial data can still be returned alongside the error details.
  """
  type Error {
    "Short machine-readable error code (e.g. 'NO_RELEVANT_SQL', 'TIMEOUT')"
    code: String
    "One-line human-readable summary"
    shortMessage: String
    "Full human-readable error message"
    message: String
    "Server-side stack trace lines (only populated in development mode)"
    stacktrace: [String]
  }

  """
  Input for starting a new natural-language question → SQL task.
  """
  input AskingTaskInput {
    "The natural-language question to answer (e.g. 'What were total sales last month?')"
    question: String!
    "Pass an existing thread ID to add this question as a follow-up within that conversation"
    threadId: Int
  }

  """
  Progress states for an asking task (NL → SQL pipeline).
  Poll askingTask until the status is FINISHED, FAILED, or STOPPED.
  """
  enum AskingTaskStatus {
    "The AI is interpreting the intent of the question"
    UNDERSTANDING
    "The AI is searching the semantic layer for relevant models and columns"
    SEARCHING
    "The AI is planning the SQL query structure"
    PLANNING
    "The AI is generating the SQL"
    GENERATING
    "The AI detected an error in the generated SQL and is self-correcting"
    CORRECTING
    "SQL generation is complete — candidates are available"
    FINISHED
    "The task failed; see the error field for details"
    FAILED
    "The task was cancelled by the user"
    STOPPED
  }

  """
  Classifies the intent detected for a user's question.
  """
  enum AskingTaskType {
    "A general data question that maps to a SELECT query"
    GENERAL
    "A question that directly produces SQL output"
    TEXT_TO_SQL
    "The question cannot be answered using the available data models"
    MISLEADING_QUERY
  }

  """
  Progress states for a chart generation task.
  Poll threadResponse.chartDetail until the status is FINISHED, FAILED, or STOPPED.
  """
  enum ChartTaskStatus {
    "Fetching data needed to generate the chart"
    FETCHING
    "The AI is generating the Vega-Lite chart specification"
    GENERATING
    "Chart specification is ready"
    FINISHED
    "Chart generation failed; see the error field for details"
    FAILED
    "Chart generation was cancelled"
    STOPPED
  }

  """
  Supported chart visualisation types.
  """
  enum ChartType {
    "Vertical or horizontal bar chart"
    BAR
    "Pie / donut chart"
    PIE
    "Line chart (single series)"
    LINE
    "Line chart with multiple series"
    MULTI_LINE
    "Area chart"
    AREA
    "Grouped (side-by-side) bar chart"
    GROUPED_BAR
    "Stacked bar chart"
    STACKED_BAR
  }

  """
  Indicates how a result candidate was produced. Affects which fields are populated
  on the ResultCandidate object.
  """
  enum ResultCandidateType {
    "The candidate comes from a previously saved view whose SQL matches the question"
    VIEW
    "The candidate was generated by the LLM during the asking task"
    LLM
    "The candidate was matched from a saved SQL-pair example"
    SQL_PAIR
  }

  """
  A single SQL candidate returned after an asking task completes.
  There may be multiple candidates ranked by confidence — the user picks one.
  """
  type ResultCandidate {
    "How this candidate was produced"
    type: ResultCandidateType!
    "The SQL query for this candidate"
    sql: String!
    "Populated when type is VIEW — the matched saved view"
    view: ViewInfo
    "Populated when type is SQL_PAIR — the matched example pair"
    sqlPair: SqlPair
  }

  """
  The full state of an asking task (NL → SQL pipeline). Poll this until
  status is FINISHED, FAILED, or STOPPED.
  """
  type AskingTask {
    "Current pipeline stage"
    status: AskingTaskStatus!
    "Detected intent type (available once UNDERSTANDING is complete)"
    type: AskingTaskType
    "Populated when status is FAILED"
    error: Error
    "Ranked SQL candidates (populated once status is FINISHED)"
    candidates: [ResultCandidate!]!
    "The question after AI rephrasing for clarity"
    rephrasedQuestion: String
    "The AI's explanation of what it understood the question to mean"
    intentReasoning: String
    "The AI's explanation of how it constructed the SQL"
    sqlGenerationReasoning: String
    "Data model tables the AI retrieved as relevant to this question"
    retrievedTables: [String!]
    "If self-correction occurred, the invalid SQL that was regenerated"
    invalidSql: String
    "LLM trace ID for debugging with the AI service"
    traceId: String
    "Query ID used to correlate this task with API history logs"
    queryId: String
  }

  """
  Input for generating instant suggested questions, optionally excluding questions
  already shown to the user.
  """
  input InstantRecommendedQuestionsInput {
    "Questions already shown; the AI will avoid regenerating these"
    previousQuestions: [String!]
  }

  """
  Progress states for a recommended questions generation task.
  """
  enum RecommendedQuestionsTaskStatus {
    "The task has not been started yet"
    NOT_STARTED
    "The AI is generating questions"
    GENERATING
    "Questions are ready"
    FINISHED
    "Generation failed"
    FAILED
  }

  """
  A single AI-recommended question with its pre-generated SQL and category label.
  """
  type ResultQuestion {
    "The natural-language question"
    question: String!
    "Thematic category (e.g. 'Revenue', 'Operations')"
    category: String!
    "Pre-generated SQL that answers this question"
    sql: String!
  }

  """
  Result of a recommended questions generation task.
  Poll getThreadRecommendationQuestions or getProjectRecommendationQuestions
  until status is FINISHED or FAILED.
  """
  type RecommendedQuestionsTask {
    "Current generation progress"
    status: RecommendedQuestionsTaskStatus!
    "The generated questions (available when status is FINISHED)"
    questions: [ResultQuestion!]!
    "Populated when status is FAILED"
    error: Error
  }

  """
  Input for creating a new conversation thread.
  A thread groups a series of question/answer exchanges in the chat UI.
  """
  input CreateThreadInput {
    "The first natural-language question (optional if sql is provided)"
    question: String
    "A SQL query to start the thread with (optional if question is provided)"
    sql: String
    "The task ID from a completed askingTask to seed this thread"
    taskId: String
  }

  """
  Input for adding a follow-up response to an existing thread.
  """
  input CreateThreadResponseInput {
    "Follow-up natural-language question (optional if sql is provided)"
    question: String
    "SQL query for this response (optional if question is provided)"
    sql: String
    "Task ID from a completed askingTask for this follow-up"
    taskId: String
  }

  """
  Filter for selecting a thread by its primary key.
  """
  input ThreadUniqueWhereInput {
    "Primary key of the thread record"
    id: Int!
  }

  """
  Input for updating a thread's summary title.
  """
  input UpdateThreadInput {
    "New summary / title for the thread (shown in the sidebar)"
    summary: String
  }

  """
  Filter for selecting a thread response by its primary key.
  """
  input ThreadResponseUniqueWhereInput {
    "Primary key of the thread response record"
    id: Int!
  }

  """
  Input for updating the SQL of an existing thread response.
  Used when the user manually edits the generated SQL.
  """
  input UpdateThreadResponseInput {
    "The corrected or manually written SQL"
    sql: String
  }

  """
  Input for adjusting the chart type and axis mappings of a thread response's chart.
  """
  input AdjustThreadResponseChartInput {
    "The new chart type to render"
    chartType: ChartType!
    "Column name to use as the X axis"
    xAxis: String
    "Column name to use as the Y axis"
    yAxis: String
    "Column name to use as the X offset (for grouped charts)"
    xOffset: String
    "Column name to use for colour encoding"
    color: String
    "Column name to use for the arc angle in pie charts (theta)"
    theta: String
  }

  """
  Input for requesting an AI adjustment to a thread response's SQL.
  The user can describe changes in plain language or provide a corrected SQL directly.
  """
  input AdjustThreadResponseInput {
    "Specific tables the AI should focus on when rewriting the SQL"
    tables: [String!]
    "A plain-language description of what changes to make (reasoning prompt for the AI)"
    sqlGenerationReasoning: String
    "A directly corrected SQL to apply without AI involvement"
    sql: String
  }

  """
  Input for previewing tabular data for a thread response or a specific breakdown step.
  """
  input PreviewDataInput {
    "Primary key of the thread response whose data to preview"
    responseId: Int!
    "If provided, preview data for only this step of the breakdown (0-based index)"
    stepIndex: Int
    "Maximum rows to return; defaults to 500 if omitted"
    limit: Int
  }

  """
  One step in a breakdown explanation. Each step is a named CTE with a summary and SQL.
  """
  type DetailStep {
    "Plain-language summary of what this step computes"
    summary: String!
    "The SQL for this step (a CTE body)"
    sql: String!
    "The CTE alias name (e.g. 'monthly_sales')"
    cteName: String
  }

  """
  Progress states for generating a natural-language answer from query data.
  """
  enum ThreadResponseAnswerStatus {
    "Answer generation has not started"
    NOT_STARTED
    "Fetching the query result data from the data source"
    FETCHING_DATA
    "Preprocessing the data before sending to the LLM"
    PREPROCESSING
    "The LLM is streaming the answer"
    STREAMING
    "The answer is complete"
    FINISHED
    "Answer generation failed"
    FAILED
    "Answer generation was interrupted (e.g. user navigated away)"
    INTERRUPTED
  }

  """
  Full detail of a generated natural-language answer for a thread response.
  """
  type ThreadResponseAnswerDetail {
    "Query ID used to correlate with API history logs"
    queryId: String
    "Current generation progress"
    status: ThreadResponseAnswerStatus
    "Populated when status is FAILED"
    error: Error
    "Number of data rows that were sent to the LLM to generate the answer"
    numRowsUsedInLLM: Int
    "The generated answer text (may be partial while status is STREAMING)"
    content: String
  }

  """
  Full detail of a step-by-step SQL breakdown for a thread response.
  """
  type ThreadResponseBreakdownDetail {
    "Query ID for correlation with API history"
    queryId: String
    "Current breakdown generation progress"
    status: AskingTaskStatus!
    "Populated when status is FAILED"
    error: Error
    "High-level description of what the full SQL query does"
    description: String
    "The individual CTE steps that make up the query"
    steps: [DetailStep!]
  }

  """
  Full detail of a chart for a thread response.
  """
  type ThreadResponseChartDetail {
    "Query ID for correlation with API history"
    queryId: String
    "Current chart generation progress"
    status: ChartTaskStatus!
    "Populated when status is FAILED"
    error: Error
    "Plain-language description of what the chart shows"
    description: String
    "The selected chart type"
    chartType: ChartType
    "Vega-Lite chart specification (JSON) used to render the chart"
    chartSchema: JSON
    "True if this chart is the result of a user adjustment rather than the original generation"
    adjustment: Boolean
  }

  """
  How an adjustment to a thread response was applied.
  """
  enum ThreadResponseAdjustmentType {
    "The adjustment was applied via the AI reasoning pipeline (new SQL generated)"
    REASONING
    "The adjustment was applied by directly substituting a provided SQL string"
    APPLY_SQL
  }

  """
  Records how the most recent adjustment to a thread response was made.
  """
  type ThreadResponseAdjustment {
    "How the adjustment was applied"
    type: ThreadResponseAdjustmentType!
    "The adjustment payload (e.g. the SQL or reasoning that was applied)"
    payload: JSON
  }

  """
  State of an in-progress SQL adjustment task for a thread response.
  Poll adjustmentTask with the returned taskId to track progress.
  """
  type AdjustmentTask {
    "Query ID for correlation with API history"
    queryId: String
    "Current adjustment pipeline progress"
    status: AskingTaskStatus
    "Populated when status is FAILED"
    error: Error
    "The adjusted SQL (available when status is FINISHED)"
    sql: String
    "LLM trace ID for debugging"
    traceId: String
    "If self-correction occurred, the invalid SQL that was regenerated"
    invalidSql: String
  }

  """
  A single question/answer exchange within a conversation thread.
  Contains the question, generated SQL, and optional enrichments
  (breakdown, chart, AI answer, adjustment).
  """
  type ThreadResponse {
    "Primary key of the thread response record"
    id: Int!
    "The thread this response belongs to"
    threadId: Int!
    "The natural-language question that was asked"
    question: String!
    "The generated SQL (null until the asking task completes)"
    sql: String
    "If the SQL was saved as a view, the view details are here"
    view: ViewInfo
    "Step-by-step breakdown of the SQL query"
    breakdownDetail: ThreadResponseBreakdownDetail
    "Natural-language answer generated from the query results"
    answerDetail: ThreadResponseAnswerDetail
    "Chart visualisation generated from the query results"
    chartDetail: ThreadResponseChartDetail
    "The asking task that produced the SQL for this response"
    askingTask: AskingTask
    "Records the most recent adjustment made to this response"
    adjustment: ThreadResponseAdjustment
    "State of an in-progress adjustment task for this response"
    adjustmentTask: AdjustmentTask
  }

  """
  Lightweight thread summary shown in the conversation sidebar.
  Fetch the full thread (with responses) using the thread(threadId:) query.
  """
  type Thread {
    "Primary key of the thread record"
    id: Int!
    "Auto-generated or user-edited title summarising the conversation"
    summary: String!
  }

  """
  Full thread detail including all of its question/answer responses.
  """
  type DetailedThread {
    "Primary key of the thread record"
    id: Int!
    "All responses in this thread, in chronological order"
    responses: [ThreadResponse!]!
  }

  """
  A pre-generated example question shown on the home page to help users
  discover what they can ask.
  """
  type SuggestedQuestion {
    "The natural-language question text"
    question: String!
    "Short thematic label for grouping (e.g. 'Revenue', 'Customers')"
    label: String!
  }

  """
  Response wrapper for the suggestedQuestions query.
  """
  type SuggestedQuestionResponse {
    "The list of suggested example questions"
    questions: [SuggestedQuestion]!
  }

  """
  Input for updating the connection properties of the current data source.
  """
  input UpdateDataSourceInput {
    "Updated connection properties (host, credentials, etc.)"
    properties: JSON!
  }

  """
  Input for changing the language used for AI-generated responses in this project.
  """
  input UpdateCurrentProjectInput {
    "The new language for AI output and suggested questions"
    language: ProjectLanguage!
  }

  """
  Project-level settings including the connected data source and language preference.
  """
  type Settings {
    "The version of WrenAI currently running"
    productVersion: String!
    "The currently connected data source"
    dataSource: DataSource!
    "The language used for AI-generated responses"
    language: ProjectLanguage!
  }

  """
  Result of the getMDL query. Contains the current Model Definition Language (MDL)
  JSON for the project, identified by a content hash.
  """
  type GetMDLResult {
    "SHA-256 hash of the MDL content, used as a cache key"
    hash: String!
    "The MDL JSON string (null if not yet generated)"
    mdl: String
  }

  """
  Input for running an ad-hoc SQL preview outside of any thread context.
  """
  input PreviewSQLDataInput {
    "The SQL query to execute"
    sql: String!
    "Optional project ID override; defaults to the current project"
    projectId: String
    "Maximum rows to return"
    limit: Int
    "If true, validates the SQL without executing it (dry run)"
    dryRun: Boolean
  }

  """
  Summary of detected schema drift between the saved data model and the live data source.
  Displayed on the Modeling page so users can review and resolve changes before redeploying.
  """
  type SchemaChange {
    "Models whose backing tables no longer exist in the data source"
    deletedTables: [DetailedChangeTable!]
    "Models with columns that have been removed from the data source"
    deletedColumns: [DetailedChangeTable!]
    "Models with columns whose data types have changed in the data source"
    modifiedColumns: [DetailedChangeTable!]
    "ISO-8601 timestamp of the most recent schema change detection run"
    lastSchemaChangeTime: String
  }

  """
  Describes the schema drift affecting a single table, including which columns
  changed and which calculated fields or relationships depend on those columns.
  """
  type DetailedChangeTable {
    "The source table name as it appears in the data source"
    sourceTableName: String!
    "User-facing display name of the model backed by this table"
    displayName: String!
    "Columns affected by this change"
    columns: [DetailedChangeColumn!]!
    "Calculated fields that reference the affected columns and may be broken"
    calculatedFields: [DetailedAffectedCalculatedFields!]!
    "Join relationships that reference the affected columns and may be broken"
    relationships: [DetailedAffectedRelationships!]!
  }

  """
  A single column affected by a schema change.
  """
  type DetailedChangeColumn {
    "Column name as it appears in the data source"
    sourceColumnName: String!
    "User-facing display name"
    displayName: String!
    "SQL data type of the column"
    type: String!
  }

  """
  A calculated field that is broken because one of its input columns was deleted or modified.
  """
  type DetailedAffectedCalculatedFields {
    "User-facing display name of the calculated field"
    displayName: String!
    "Internal reference name"
    referenceName: String!
    "SQL data type of the calculated field"
    type: String!
  }

  """
  A join relationship that is broken because one of its join columns was deleted or modified.
  """
  type DetailedAffectedRelationships {
    "User-facing display name of the relationship"
    displayName: String!
    "Internal reference name"
    referenceName: String!
  }

  """
  Input for dismissing a category of schema changes after the user has reviewed them.
  """
  input ResolveSchemaChangeWhereInput {
    "The category of schema change to mark as resolved"
    type: SchemaChangeType!
  }

  """
  Tracks which UI sections (paths) the user has already visited.
  Used to show contextual onboarding hints only once.
  """
  type LearningRecord {
    "List of URL paths the user has navigated to"
    paths: [String!]!
  }

  """
  Input for recording that the user has visited a new page in the UI.
  """
  input SaveLearningRecordInput {
    "The URL path the user visited (e.g. '/modeling', '/home')"
    path: String!
  }

  """
  Visualisation type for a dashboard item.
  Mirrors ChartType but also includes TABLE and NUMBER for non-chart items.
  """
  enum DashboardItemType {
    "Vertical or horizontal bar chart"
    BAR
    "Pie / donut chart"
    PIE
    "Line chart"
    LINE
    "Multi-series line chart"
    MULTI_LINE
    "Area chart"
    AREA
    "Grouped bar chart"
    GROUPED_BAR
    "Stacked bar chart"
    STACKED_BAR
    "Tabular data grid"
    TABLE
    "Single KPI / metric number"
    NUMBER
  }

  """
  Filter for selecting a dashboard item by its primary key.
  """
  input DashboardItemWhereInput {
    "Primary key of the dashboard item record"
    id: Int!
  }

  """
  Input for adding a new visualisation to the dashboard.
  The SQL and chart schema are taken from an existing thread response.
  """
  input CreateDashboardItemInput {
    "The visualisation type to display"
    itemType: DashboardItemType!
    "ID of the thread response whose SQL and chart schema back this dashboard item"
    responseId: Int!
  }

  """
  Input for renaming a dashboard item.
  """
  input UpdateDashboardItemInput {
    "New user-facing display name shown on the dashboard tile"
    displayName: String!
  }

  """
  Grid layout coordinates for a single dashboard item. Uses a 12-column grid.
  """
  input ItemLayoutInput {
    "ID of the dashboard item to position"
    itemId: Int!
    "Horizontal grid position (0-based column index)"
    x: Int!
    "Vertical grid position (0-based row index)"
    y: Int!
    "Width in grid columns"
    w: Int!
    "Height in grid rows"
    h: Int!
  }

  """
  Input for batch-updating the grid layout of all dashboard items.
  Sent after the user finishes drag-and-drop rearrangement.
  """
  input UpdateDashboardItemLayoutsInput {
    "The new layout for every dashboard item (all items must be included)"
    layouts: [ItemLayoutInput!]!
  }

  """
  Input for removing a dashboard item.
  """
  input DeleteDashboardItemInput {
    "ID of the dashboard item to remove"
    itemId: Int!
  }

  """
  Input for previewing the data that will be displayed by a dashboard item.
  """
  input PreviewItemSQLInput {
    "ID of the dashboard item to preview"
    itemId: Int!
    "Maximum rows to return"
    limit: Int
    "If true, bypass the cache and fetch fresh data from the data source"
    refresh: Boolean = false
  }

  """
  Result of a dashboard item data preview, including cache metadata.
  """
  type PreviewItemResponse {
    "The query result rows"
    data: JSON!
    "True if the data came from the cache rather than a live query"
    cacheHit: Boolean!
    "ISO-8601 timestamp when the cache entry was originally created"
    cacheCreatedAt: String
    "ISO-8601 timestamp when the cache was last force-refreshed"
    cacheOverrodeAt: String
    "True if this response overrode (refreshed) the cache"
    override: Boolean!
  }

  """
  Input for enabling or updating the automatic cache refresh schedule for a dashboard.
  """
  input SetDashboardScheduleInput {
    "Whether to enable automatic cache refreshing on a schedule"
    cacheEnabled: Boolean!
    "Schedule configuration; required when cacheEnabled is true"
    schedule: SetDashboardScheduleData
  }

  """
  The active cache refresh schedule for a dashboard.
  """
  type DashboardSchedule {
    "How often to refresh the cache"
    frequency: ScheduleFrequencyEnum
    "Hour of the day to run the refresh (0–23, UTC unless timezone is set)"
    hour: Int
    "Minute of the hour to run the refresh (0–59)"
    minute: Int
    "Day of the week for weekly schedules"
    day: CacheScheduleDayEnum
    "IANA timezone name (e.g. 'Asia/Ho_Chi_Minh'); defaults to UTC if omitted"
    timezone: String
    "Raw cron expression (used when frequency is CUSTOM)"
    cron: String
  }

  """
  Input data for defining a specific refresh schedule.
  """
  input SetDashboardScheduleData {
    "How often to refresh"
    frequency: ScheduleFrequencyEnum!
    "Hour of the day (0–23)"
    hour: Int
    "Minute of the hour (0–59)"
    minute: Int
    "Day of the week for weekly frequency"
    day: CacheScheduleDayEnum
    "IANA timezone name"
    timezone: String
    "Raw cron expression for custom frequency"
    cron: String
  }

  """
  Preset refresh frequencies for the dashboard cache schedule.
  """
  enum ScheduleFrequencyEnum {
    "Refresh once every day"
    DAILY
    "Refresh once every week"
    WEEKLY
    "Refresh on a custom cron schedule"
    CUSTOM
    "Disable automatic refreshing"
    NEVER
  }

  """
  Day of the week selector for weekly dashboard cache schedules.
  """
  enum CacheScheduleDayEnum {
    "Sunday"
    SUN
    "Monday"
    MON
    "Tuesday"
    TUE
    "Wednesday"
    WED
    "Thursday"
    THU
    "Friday"
    FRI
    "Saturday"
    SAT
  }

  """
  Grid position and size of a dashboard item on the 12-column layout grid.
  """
  type DashboardItemLayout {
    "Horizontal grid position (0-based column index)"
    x: Int!
    "Vertical grid position (0-based row index)"
    y: Int!
    "Width in grid columns"
    w: Int!
    "Height in grid rows"
    h: Int!
  }

  """
  The SQL and optional chart configuration backing a dashboard item.
  """
  type DashboardItemDetail {
    "The SQL query executed to produce this item's data"
    sql: String!
    "Vega-Lite chart specification (null for TABLE and NUMBER items)"
    chartSchema: JSON
  }

  """
  A single tile on the project dashboard. Contains a visualisation
  (chart, table, or number) backed by a SQL query.
  """
  type DashboardItem {
    "Primary key of the dashboard item record"
    id: Int!
    "The dashboard this item belongs to"
    dashboardId: Int!
    "The visualisation type"
    type: DashboardItemType!
    "Current grid position and size"
    layout: DashboardItemLayout!
    "The SQL and chart schema for this item"
    detail: DashboardItemDetail!
    "User-facing display name shown on the tile header"
    displayName: String
  }

  """
  Lightweight dashboard summary (without items or schedule detail).
  Returned by setDashboardSchedule to confirm the updated schedule.
  """
  type Dashboard {
    "Primary key of the dashboard record"
    id: Int!
    "The project this dashboard belongs to"
    projectId: Int!
    "Dashboard name"
    name: String!
    "True if automatic cache refreshing is enabled"
    cacheEnabled: Boolean!
    "Preset frequency of the active schedule"
    scheduleFrequency: ScheduleFrequencyEnum
    "IANA timezone name of the active schedule"
    scheduleTimezone: String
    "Raw cron expression of the active schedule"
    scheduleCron: String
    "ISO-8601 timestamp of the next scheduled cache refresh"
    nextScheduledAt: String
  }

  """
  Full dashboard detail including all items and the active refresh schedule.
  Returned by the dashboard query.
  """
  type DetailedDashboard {
    "Primary key of the dashboard record"
    id: Int!
    "Dashboard name"
    name: String!
    "Optional description of the dashboard's purpose"
    description: String
    "True if automatic cache refreshing is enabled"
    cacheEnabled: Boolean!
    "ISO-8601 timestamp of the next scheduled cache refresh"
    nextScheduledAt: String
    "The active refresh schedule configuration"
    schedule: DashboardSchedule
    "All items currently on the dashboard"
    items: [DashboardItem!]!
  }

  """
  A saved question–SQL example pair used to improve the AI's SQL generation accuracy.
  SQL-pairs act as few-shot examples: when a user asks a similar question, the AI can
  reference the saved SQL as a starting point.
  """
  type SqlPair {
    "Primary key of the SQL-pair record"
    id: Int!
    "The project this SQL-pair belongs to"
    projectId: Int!
    "The SQL query that answers the example question"
    sql: String!
    "The example natural-language question"
    question: String!
    "ISO-8601 timestamp when this pair was created"
    createdAt: String
    "ISO-8601 timestamp when this pair was last updated"
    updatedAt: String
  }

  """
  Input for saving a new SQL-pair example.
  """
  input CreateSqlPairInput {
    "The SQL query"
    sql: String!
    "The natural-language question this SQL answers"
    question: String!
  }

  """
  Input for updating an existing SQL-pair. Only the provided fields are changed.
  """
  input UpdateSqlPairInput {
    "Updated SQL query"
    sql: String
    "Updated natural-language question"
    question: String
  }

  """
  Filter for selecting a SQL-pair by its primary key.
  """
  input SqlPairWhereUniqueInput {
    "Primary key of the SQL-pair record"
    id: Int!
  }

  """
  Input for generating a natural-language question from a SQL query.
  Used to auto-fill the question field when a user saves a SQL-pair.
  """
  input GenerateQuestionInput {
    "The SQL query to generate a question for"
    sql: String!
  }

  """
  Input for the modelSubstitute mutation.
  Rewrites a SQL query written against raw table names to use the WrenAI
  semantic model reference names instead, making it portable across data source changes.
  """
  input ModelSubstituteInput {
    "The dialect-specific SQL query to rewrite"
    sql: DialectSQL!
  }

  """
  A saved instruction that guides the AI's SQL generation behaviour for a project.
  Instructions can be globally applied (isDefault) or triggered by specific question patterns.
  Example: 'Always filter orders by status = COMPLETED unless the user asks for all orders.'
  """
  type Instruction {
    "Primary key of the instruction record"
    id: Int!
    "The project this instruction belongs to"
    projectId: Int!
    "The instruction text sent to the AI with every matching query"
    instruction: String!
    "Question patterns that trigger this instruction (empty if isDefault is true)"
    questions: [String!]!
    "If true, this instruction is sent with every query regardless of the question"
    isDefault: Boolean!
    "ISO-8601 timestamp when this instruction was created"
    createdAt: String!
    "ISO-8601 timestamp when this instruction was last updated"
    updatedAt: String!
  }

  """
  Input for creating a new instruction.
  """
  input CreateInstructionInput {
    "The instruction text"
    instruction: String!
    "Question patterns that trigger this instruction (may be empty when isDefault is true)"
    questions: [String!]!
    "If true, apply this instruction to every query"
    isDefault: Boolean!
  }

  """
  Input for updating an existing instruction. Only the provided fields are changed.
  """
  input UpdateInstructionInput {
    "Updated instruction text"
    instruction: String
    "Updated question patterns"
    questions: [String!]
    "Updated default flag"
    isDefault: Boolean
  }

  """
  Filter for selecting an instruction by its primary key.
  """
  input InstructionWhereInput {
    "Primary key of the instruction record"
    id: Int!
  }

  """
  Progress states for an AI relationship recommendation task.
  """
  enum RelationshipRecommendationStatus {
    "The AI is analysing models and generating relationship suggestions"
    generating
    "Recommendations are ready"
    finished
    "Recommendation generation failed"
    failed
  }

  """
  A single AI-recommended join relationship between two models.
  Includes the AI's reasoning so the user can evaluate whether to accept it.
  """
  type AIRelationship {
    "Suggested relationship name"
    name: String!
    "Display name of the from-side model"
    fromModel: String!
    "Display name of the from-side join column"
    fromColumn: String!
    "Suggested join cardinality"
    type: String!
    "Display name of the to-side model"
    toModel: String!
    "Display name of the to-side join column"
    toColumn: String!
    "The AI's explanation for why this join makes sense"
    reason: String!
    "ID of the from-side model (required when accepting the recommendation)"
    fromModelId: Int!
    "Reference name of the from-side model"
    fromModelReferenceName: String!
    "ID of the from-side join column"
    fromColumnId: Int!
    "Reference name of the from-side join column"
    fromColumnReferenceName: String!
    "ID of the to-side model"
    toModelId: Int!
    "Reference name of the to-side model"
    toModelReferenceName: String!
    "ID of the to-side join column"
    toColumnId: Int!
    "Reference name of the to-side join column"
    toColumnReferenceName: String!
  }

  """
  State of an AI relationship recommendation task. Poll
  relationshipRecommendationTask with the returned taskId until status is finished or failed.
  """
  type RelationshipRecommendationTask {
    "Current generation progress"
    status: RelationshipRecommendationStatus!
    "The recommended relationships (available when status is finished)"
    relationships: [AIRelationship!]
    "Populated when status is failed"
    error: Error
  }

  """
  Progress states for an AI ontology recommendation task.
  """
  enum OntologyRecommendationStatus {
    "The AI is analysing models and generating ontology suggestions"
    generating
    "Recommendations are ready"
    finished
    "Recommendation generation failed"
    failed
  }

  """
  A single attribute (column mapping) within an ontology entity.
  Maps a business-friendly attribute name to its source column.
  """
  type OntologyAttribute {
    "Business-friendly attribute name (e.g. 'Customer Name')"
    name: String!
    "The source model column this attribute maps to"
    sourceColumn: String!
    "Description of what this attribute represents"
    description: String
  }

  """
  A business entity in the ontology semantic layer.
  Entities are business concepts (e.g. 'Customer', 'Order') mapped to data models.
  """
  type OntologyEntity {
    "Unique entity ID within the ontology"
    id: String
    "Business entity name (e.g. 'Customer')"
    name: String!
    "User-facing display name"
    displayName: String
    "Description of what this business concept represents"
    description: String
    "The data model that backs this entity"
    sourceModel: String!
    "Business attributes exposed by this entity"
    attributes: [OntologyAttribute!]
  }

  """
  A semantic relationship between two ontology entities.
  Mirrors the underlying model join but expressed in business terms.
  """
  type OntologyRelationship {
    "Unique relationship ID within the ontology"
    id: String
    "Business name for this relationship (e.g. 'CustomerPlacesOrder')"
    name: String!
    "Name of the from-side entity"
    fromEntity: String!
    "Name of the to-side entity"
    toEntity: String!
    "Relationship type (e.g. 'one-to-many')"
    type: String!
    "Description of what this relationship means in business terms"
    description: String
    "The underlying model relationship this is derived from"
    sourceRelation: String
  }

  """
  The full ontology graph: all business entities and their relationships.
  """
  type OntologyGraph {
    "All business entities defined in the ontology"
    entities: [OntologyEntity!]!
    "Semantic relationships between the entities"
    relationships: [OntologyRelationship!]!
  }

  """
  The saved ontology for the current project.
  The ontology is a business-language semantic layer built on top of the data models.
  """
  type Ontology {
    "Primary key of the ontology record"
    id: Int!
    "The project this ontology belongs to"
    projectId: Int!
    "The ontology entity and relationship graph"
    definition: OntologyGraph
    "Lifecycle status of the ontology (e.g. 'draft', 'published')"
    status: String!
    "How this ontology was created: 'AI' for generated, 'manual' for user-authored"
    generatedBy: String
  }

  """
  State of an AI ontology recommendation task. Poll ontologyRecommendationTask
  with the returned taskId until status is finished or failed.
  """
  type OntologyRecommendationTask {
    "Current generation progress"
    status: OntologyRecommendationStatus!
    "The recommended ontology graph (available when status is finished)"
    definition: OntologyGraph
    "Populated when status is failed"
    error: Error
  }

  """
  A data service registered in the connected OpenMetadata instance.
  Used to link WrenAI models to their OpenMetadata counterparts for metadata enrichment.
  """
  type OMService {
    "The unique service name in OpenMetadata"
    name: String!
    "The type of service (e.g. 'DatabaseService', 'MessagingService')"
    serviceType: String!
    "Description of the service from OpenMetadata"
    description: String
    "Host and port of the service's database (if applicable)"
    hostPort: String
    "Username used to connect to the service (if applicable)"
    username: String
  }

  """
  A glossary defined in the connected OpenMetadata instance.
  Glossaries can be imported as WrenAI instructions to guide SQL generation.
  """
  type OMGlossary {
    "The unique glossary name in OpenMetadata"
    name: String!
    "User-facing display name"
    displayName: String
    "Description of the glossary's purpose"
    description: String
  }

  """
  Input for linking or unlinking a specific OpenMetadata service to/from this project.
  """
  input OpenMetadataProjectConfigInput {
    "The OpenMetadata service name to associate with this project"
    serviceName: String
    "Whether to enable OpenMetadata integration for this project"
    enabled: Boolean!
  }

  type Query {
    # ── Onboarding ────────────────────────────────────────────────────────────

    """
    Returns the list of tables (with columns) available in the connected data source.
    Called during onboarding so the user can choose which tables to include in their model.
    """
    listDataSourceTables: [CompactTable!]!

    """
    Asks the AI to suggest join relationships for the tables selected during onboarding.
    Returns one RecommendRelations entry per selected model; each contains a list of
    recommended joins for the user to review and accept or discard.
    """
    autoGenerateRelation: [RecommendRelations!]!

    """
    Returns the current onboarding progress for the active project.
    Use this to determine which step of the setup wizard to show.
    """
    onboardingStatus: OnboardingStatusResponse!

    # ── Modeling ──────────────────────────────────────────────────────────────

    """
    Returns all data models defined in the current project, including their
    columns and calculated fields. Does not include join relationships
    (use diagram for those).
    """
    listModels: [ModelInfo!]!

    """
    Returns the full detail of a single data model, including all columns,
    calculated fields, and join relationships.
    """
    model(where: ModelWhereInput!): DetailedModel!

    """
    Checks whether the AI service is using the latest deployed version of the data model.
    Returns UNSYNCRONIZED if the model has changed since the last deploy — in that case
    prompt the user to redeploy.
    """
    modelSync: ModelSyncResponse!

    """
    Returns the full ER diagram for the project: all models, views, fields,
    and the join relationships between models. Used to render the visual
    data model canvas in the Modeling page.
    """
    diagram: Diagram!

    """
    Detects schema drift between the saved data model and the live data source
    (deleted tables, deleted columns, modified column types).
    Returns empty lists when no drift is detected.
    """
    schemaChange: SchemaChange!

    # ── Views ─────────────────────────────────────────────────────────────────

    """
    Returns all saved SQL views in the current project.
    """
    listViews: [ViewInfo!]!

    """
    Returns the detail of a single saved view.
    """
    view(where: ViewWhereUniqueInput!): ViewInfo!

    # ── Asking ────────────────────────────────────────────────────────────────

    """
    Polls the current state of a natural-language → SQL asking task.
    Call repeatedly until status is FINISHED, FAILED, or STOPPED.
    The taskId is returned by the createAskingTask mutation.
    """
    askingTask(taskId: String!, threadId: String): AskingTask

    """
    Returns a list of pre-generated example questions for the home page.
    These questions are generated from the project's data model and cached
    to avoid repeated LLM calls.
    """
    suggestedQuestions: SuggestedQuestionResponse!

    """
    Returns all conversation threads for the current project, sorted by recency.
    Each thread contains only a summary; use thread(threadId:) for the full response list.
    """
    threads: [Thread!]!

    """
    Returns the full detail of a single thread, including all of its
    question/answer responses in chronological order.
    """
    thread(threadId: Int!): DetailedThread!

    """
    Returns the current state of a single thread response.
    Useful for polling after triggering async enrichments
    (breakdown, answer, chart generation).
    """
    threadResponse(responseId: Int!): ThreadResponse!

    """
    Returns the native (data-source-dialect) SQL for a thread response.
    The BFF translates the WrenSQL generated by the AI into the target dialect
    before execution — this query exposes that translated SQL.
    """
    nativeSql(responseId: Int!): String!

    # ── Adjustment ────────────────────────────────────────────────────────────

    """
    Polls the current state of a SQL adjustment task.
    Call repeatedly until status is FINISHED, FAILED, or STOPPED.
    The taskId is returned by the adjustThreadResponse mutation.
    """
    adjustmentTask(taskId: String!, threadId: String): AdjustmentTask

    # ── Settings ──────────────────────────────────────────────────────────────

    """
    Returns the project's current settings: data source connection, language,
    and product version.
    """
    settings: Settings!

    # ── System ────────────────────────────────────────────────────────────────

    """
    Retrieves the Model Definition Language (MDL) JSON for a specific project snapshot,
    identified by its content hash. Used by external integrations that consume the MDL
    directly (e.g. the AI service).
    """
    getMDL(hash: String!): GetMDLResult!

    # ── Learning ──────────────────────────────────────────────────────────────

    """
    Returns the list of UI paths the current user has already visited.
    Used to suppress onboarding hints that the user has already seen.
    """
    learningRecord: LearningRecord!

    # ── Recommended Questions ─────────────────────────────────────────────────

    """
    Polls the state of a thread-scoped recommended questions task.
    Recommended questions are follow-up questions suggested after a thread response.
    Call repeatedly until status is FINISHED or FAILED.
    """
    getThreadRecommendationQuestions(threadId: Int!): RecommendedQuestionsTask!

    """
    Polls the state of a project-level recommended questions task.
    Project recommendations are general questions based on the whole data model,
    shown on the home page.
    """
    getProjectRecommendationQuestions: RecommendedQuestionsTask!

    """
    Polls the state of an instant recommended questions task.
    Instant recommendations are generated on-demand when the user wants fresh suggestions.
    """
    instantRecommendedQuestions(taskId: String!): RecommendedQuestionsTask!

    # ── Dashboard ─────────────────────────────────────────────────────────────

    """
    Returns all items currently on the project dashboard.
    """
    dashboardItems: [DashboardItem!]!

    """
    Returns the full dashboard detail including all items, layout, and cache schedule.
    """
    dashboard: DetailedDashboard!

    # ── SQL Pairs & Instructions ──────────────────────────────────────────────

    """
    Returns all SQL-pair examples saved for the current project.
    SQL-pairs improve AI accuracy by providing question–SQL examples for few-shot learning.
    """
    sqlPairs: [SqlPair]!

    """
    Returns all instructions saved for the current project.
    Instructions are rules that guide the AI's SQL generation behaviour.
    """
    instructions: [Instruction]!

    # ── API History ───────────────────────────────────────────────────────────

    """
    Returns a paginated, filterable log of all BFF API calls for this project.
    Useful for usage analytics, debugging, and billing attribution.
    """
    apiHistory(
      filter: ApiHistoryFilterInput
      pagination: ApiHistoryPaginationInput!
    ): ApiHistoryPaginatedResponse!

    # ── Relationship Recommendation ───────────────────────────────────────────

    """
    Polls the state of an AI relationship recommendation task.
    Call repeatedly until status is finished or failed.
    The taskId is returned by the generateRelationshipRecommendations mutation.
    """
    relationshipRecommendationTask(
      taskId: String!
    ): RelationshipRecommendationTask!

    # ── Ontology ──────────────────────────────────────────────────────────────

    """
    Returns the current saved ontology for the project, or null if none has been saved yet.
    The ontology is a business-language semantic layer built on top of the data models.
    """
    ontology: Ontology

    """
    Polls the state of an AI ontology recommendation task.
    Call repeatedly until status is finished or failed.
    The taskId is returned by the generateOntologyRecommendations mutation.
    """
    ontologyRecommendationTask(taskId: String!): OntologyRecommendationTask!

    # ── OpenMetadata ──────────────────────────────────────────────────────────

    """
    Returns all data services registered in the connected OpenMetadata instance.
    The user selects one service to link to this project for metadata enrichment.
    """
    listOpenMetadataServices: [OMService!]!

    """
    Returns all glossaries defined in the connected OpenMetadata instance.
    Glossaries can be imported as WrenAI instructions.
    """
    listOpenMetadataGlossaries: [OMGlossary!]!
  }

  type Mutation {
    # ── Onboarding ────────────────────────────────────────────────────────────

    """
    Saves the data source connection for the current project.
    This is the first step of the onboarding wizard.
    Returns the saved data source configuration.
    """
    saveDataSource(data: DataSourceInput!): DataSource!

    """
    Loads a built-in sample dataset into the project as a DuckDB data source.
    Skips the full onboarding wizard — the project is ready to query immediately.
    """
    startSampleDataset(data: SampleDatasetInput!): JSON!

    """
    Saves the list of tables selected by the user during onboarding.
    Each selected table becomes a data model in the project.
    """
    saveTables(data: SaveTablesInput!): JSON!

    """
    Saves the join relationships configured during onboarding (or later in the
    Modeling page). Replaces the entire existing set of relationships.
    """
    saveRelations(data: SaveRelationInput!): JSON!

    """
    Deploys the current data model to the AI service.
    This builds the vector store index that powers natural-language queries.
    Pass force: true to redeploy even when the model appears to be in sync.
    """
    deploy(force: Boolean): JSON!

    # ── Modeling ──────────────────────────────────────────────────────────────

    """
    Creates a new data model from a source table, exposing the selected columns.
    The model is not queryable by AI until deploy is called.
    """
    createModel(data: CreateModelInput!): JSON!

    """
    Updates which columns are exposed by an existing model, and optionally
    changes its primary key. The model must be redeployed after this change.
    """
    updateModel(where: ModelWhereInput!, data: UpdateModelInput!): JSON!

    """
    Permanently deletes a model and all associated calculated fields and relationships.
    This action cannot be undone. The model must be redeployed after deletion.
    """
    deleteModel(where: ModelWhereInput!): Boolean!

    """
    Runs the model's SQL against the data source and returns the first 500 rows.
    Used for the data preview panel in the Modeling page.
    """
    previewModelData(where: WhereIdInput!): JSON!

    """
    Manually triggers a schema change detection run against the connected data source.
    The result is then available via the schemaChange query.
    """
    triggerDataSourceDetection: Boolean!

    """
    Marks a category of schema changes as resolved, removing them from the
    schemaChange result. Call this after the user has reviewed and handled
    a particular type of drift (deleted tables, deleted columns, or modified columns).
    """
    resolveSchemaChange(where: ResolveSchemaChangeWhereInput!): Boolean!

    # ── Metadata ──────────────────────────────────────────────────────────────

    """
    Updates display names and descriptions for a model and any subset of its
    columns, calculated fields, and relationships. Only provided fields are changed.
    Metadata changes are reflected in the AI context on the next deploy.
    """
    updateModelMetadata(
      where: ModelWhereInput!
      data: UpdateModelMetadataInput!
    ): Boolean!

    """
    Updates the display name, description, and column descriptions of a saved view.
    """
    updateViewMetadata(
      where: ViewWhereUniqueInput!
      data: UpdateViewMetadataInput!
    ): Boolean!

    # ── Relationships ─────────────────────────────────────────────────────────

    """
    Creates a new join relationship between two models.
    Returns the updated model graph JSON.
    """
    createRelation(data: RelationInput!): JSON!

    """
    Updates the cardinality of an existing join relationship.
    """
    updateRelation(data: UpdateRelationInput!, where: WhereIdInput!): JSON!

    """
    Permanently deletes a join relationship between two models.
    """
    deleteRelation(where: WhereIdInput!): Boolean!

    """
    Starts an AI task that analyses the current models and suggests join relationships.
    Returns a Task handle — poll relationshipRecommendationTask with the task ID
    until status is finished or failed.
    """
    generateRelationshipRecommendations: Task!

    # ── Ontology ──────────────────────────────────────────────────────────────

    """
    Starts an AI task that analyses the current data model and generates a
    business-language ontology (entities, attributes, relationships).
    Returns a Task handle — poll ontologyRecommendationTask with the task ID
    until status is finished or failed.
    """
    generateOntologyRecommendations: Task!

    """
    Saves a (possibly AI-generated, possibly user-edited) ontology as the
    active ontology for the project. Replaces any previously saved ontology.
    """
    saveOntology(data: JSON!): Ontology!

    # ── Calculated Fields ─────────────────────────────────────────────────────

    """
    Adds a new calculated field to a model. The field is defined by a supported
    aggregation / math expression applied to a chain of model columns.
    The model must be redeployed for the field to be queryable by AI.
    """
    createCalculatedField(data: CreateCalculatedFieldInput!): JSON!

    """
    Updates the formula of an existing calculated field.
    """
    updateCalculatedField(
      where: UpdateCalculatedFieldWhere!
      data: UpdateCalculatedFieldInput!
    ): JSON!

    """
    Permanently deletes a calculated field from a model.
    """
    deleteCalculatedField(where: UpdateCalculatedFieldWhere): Boolean!

    """
    Checks whether a proposed calculated field name is valid and unique within
    the model before the user saves it. Returns a validation result with an
    explanation if the name is invalid.
    """
    validateCalculatedField(
      data: ValidateCalculatedFieldInput!
    ): CalculatedFieldValidationResponse!

    # ── Views ─────────────────────────────────────────────────────────────────

    """
    Saves a thread response's SQL as a named, reusable view.
    Views are usable as data sources in future thread responses and dashboard items.
    """
    createView(data: CreateViewInput!): ViewInfo!

    """
    Permanently deletes a saved view.
    """
    deleteView(where: ViewWhereUniqueInput!): Boolean!

    """
    Executes a view's SQL and returns a preview of the results (up to 500 rows).
    """
    previewViewData(where: PreviewViewDataInput!): JSON!

    """
    Checks whether a proposed view name is already in use within the project.
    Call this before createView to give the user immediate feedback.
    """
    validateView(data: ValidateViewInput!): ViewValidationResponse!

    # ── Asking ────────────────────────────────────────────────────────────────

    """
    Starts an asynchronous NL → SQL asking task for a natural-language question.
    Returns a Task handle — poll askingTask with the task ID until status is
    FINISHED, FAILED, or STOPPED.
    Optionally pass threadId to make this a follow-up within an existing conversation.
    """
    createAskingTask(data: AskingTaskInput!): Task!

    """
    Cancels an in-progress asking task. Returns true if the cancellation was accepted.
    Has no effect if the task has already finished.
    """
    cancelAskingTask(taskId: String!): Boolean!

    """
    Re-runs the asking pipeline for an existing thread response, generating
    fresh SQL candidates. Useful when the user wants to retry after a failure.
    Returns a new Task handle to poll.
    """
    rerunAskingTask(responseId: Int!): Task!

    # ── Threads ───────────────────────────────────────────────────────────────

    """
    Creates a new conversation thread, optionally seeded with an initial question
    or the result of a completed asking task.
    """
    createThread(data: CreateThreadInput!): Thread!

    """
    Updates the summary (title) of a thread as shown in the conversation sidebar.
    """
    updateThread(
      where: ThreadUniqueWhereInput!
      data: UpdateThreadInput!
    ): Thread!

    """
    Permanently deletes a thread and all of its responses.
    """
    deleteThread(where: ThreadUniqueWhereInput!): Boolean!

    # ── Thread Responses ──────────────────────────────────────────────────────

    """
    Adds a follow-up question/answer exchange to an existing thread.
    Can be seeded from a completed asking task or provided with an explicit SQL.
    """
    createThreadResponse(
      threadId: Int!
      data: CreateThreadResponseInput!
    ): ThreadResponse!

    """
    Updates the SQL of an existing thread response (e.g. after manual SQL editing).
    Clears any previously generated breakdown, answer, and chart so they can be regenerated.
    """
    updateThreadResponse(
      where: ThreadResponseUniqueWhereInput!
      data: UpdateThreadResponseInput!
    ): ThreadResponse!

    """
    Executes a thread response's SQL and returns a preview of the results (up to 500 rows).
    Optionally scope the preview to a single breakdown step using stepIndex.
    """
    previewData(where: PreviewDataInput!): JSON!

    """
    Executes the SQL for a specific breakdown step and returns its preview data.
    Used in the breakdown panel to preview each CTE step individually.
    """
    previewBreakdownData(where: PreviewDataInput!): JSON!

    # ── Thread Response Enrichments ───────────────────────────────────────────

    """
    Generates a step-by-step SQL breakdown for a thread response.
    The breakdown explains the SQL as a series of named CTEs with plain-language summaries.
    Poll threadResponse.breakdownDetail.status after calling this.
    """
    generateThreadResponseBreakdown(responseId: Int!): ThreadResponse!

    """
    Generates a natural-language answer from the thread response's query results.
    The AI summarises the data into a human-readable paragraph.
    Poll threadResponse.answerDetail.status after calling this.
    """
    generateThreadResponseAnswer(responseId: Int!): ThreadResponse!

    """
    Generates a Vega-Lite chart specification for a thread response.
    The AI selects the most appropriate chart type and axis mappings.
    Poll threadResponse.chartDetail.status after calling this.
    """
    generateThreadResponseChart(responseId: Int!): ThreadResponse!

    """
    Updates the chart type and axis mappings for a thread response's chart.
    Does not call the AI — applies the user's explicit chart configuration directly.
    """
    adjustThreadResponseChart(
      responseId: Int!
      data: AdjustThreadResponseChartInput!
    ): ThreadResponse!

    # ── Adjustment ────────────────────────────────────────────────────────────

    """
    Starts an AI adjustment task to rewrite a thread response's SQL based on
    the user's feedback. The user can describe the desired change in plain language
    or provide a corrected SQL directly.
    Returns the updated ThreadResponse — poll adjustmentTask for task progress.
    """
    adjustThreadResponse(
      responseId: Int!
      data: AdjustThreadResponseInput!
    ): ThreadResponse!

    """
    Cancels an in-progress adjustment task. Returns true if accepted.
    """
    cancelAdjustmentTask(taskId: String!): Boolean!

    """
    Re-runs the adjustment pipeline for a thread response that previously failed.
    Returns true if the rerun was accepted.
    """
    rerunAdjustmentTask(responseId: Int!): Boolean!

    # ── Settings ──────────────────────────────────────────────────────────────

    """
    Deletes all models, views, threads, and configuration for the current project,
    resetting it to a blank slate. This action is irreversible.
    """
    resetCurrentProject: Boolean!

    """
    Updates the language used for AI-generated responses in this project.
    The change takes effect immediately for new questions.
    """
    updateCurrentProject(data: UpdateCurrentProjectInput!): Boolean!

    """
    Updates the connection properties of the current data source
    (e.g. to rotate credentials or change the target database).
    Returns the updated data source configuration.
    """
    updateDataSource(data: UpdateDataSourceInput!): DataSource!

    # ── SQL Preview ───────────────────────────────────────────────────────────

    """
    Executes an arbitrary SQL query against the data source and returns the results.
    Used for the SQL editor preview panel. Supports dry-run mode for syntax validation.
    """
    previewSql(data: PreviewSQLDataInput): JSON!

    # ── Learning ──────────────────────────────────────────────────────────────

    """
    Records that the current user has visited a UI page.
    Used to track onboarding progress and suppress hints the user has already seen.
    """
    saveLearningRecord(data: SaveLearningRecordInput!): LearningRecord!

    # ── Recommended Questions ─────────────────────────────────────────────────

    """
    Triggers AI generation of recommended follow-up questions for a specific thread.
    Questions are scoped to the context of that conversation.
    Poll getThreadRecommendationQuestions with the threadId until status is FINISHED.
    """
    generateThreadRecommendationQuestions(threadId: Int!): Boolean!

    """
    Triggers AI generation of recommended questions based on the entire project data model.
    These are the general questions shown on the home page.
    Poll getProjectRecommendationQuestions until status is FINISHED.
    """
    generateProjectRecommendationQuestions: Boolean!

    """
    Starts an instant recommended questions task, optionally excluding questions
    already shown to avoid repetition.
    Returns a Task handle — poll instantRecommendedQuestions with the task ID.
    """
    createInstantRecommendedQuestions(
      data: InstantRecommendedQuestionsInput!
    ): Task!

    # ── Dashboard ─────────────────────────────────────────────────────────────

    """
    Batch-updates the grid layout (position and size) of all dashboard items.
    Called after the user finishes drag-and-drop rearrangement.
    Returns the updated list of dashboard items with their new layouts.
    """
    updateDashboardItemLayouts(
      data: UpdateDashboardItemLayoutsInput!
    ): [DashboardItem!]!

    """
    Adds a new visualisation tile to the dashboard, backed by an existing thread response.
    Returns the newly created dashboard item.
    """
    createDashboardItem(data: CreateDashboardItemInput!): DashboardItem!

    """
    Renames a dashboard item.
    """
    updateDashboardItem(
      where: DashboardItemWhereInput!
      data: UpdateDashboardItemInput!
    ): DashboardItem!

    """
    Permanently removes a dashboard item.
    """
    deleteDashboardItem(where: DashboardItemWhereInput!): Boolean!

    """
    Executes a dashboard item's SQL and returns a preview of the results.
    Pass refresh: true to bypass the cache and fetch fresh data.
    """
    previewItemSQL(data: PreviewItemSQLInput!): PreviewItemResponse!

    """
    Enables or disables the automatic cache refresh schedule for the dashboard,
    and sets the schedule configuration (frequency, time, timezone).
    Returns the updated dashboard with the new schedule applied.
    """
    setDashboardSchedule(data: SetDashboardScheduleInput!): Dashboard!

    # ── SQL Pairs ─────────────────────────────────────────────────────────────

    """
    Saves a new SQL-pair (question + SQL example) to improve AI accuracy.
    The pair is indexed and used as a few-shot example for similar future questions.
    """
    createSqlPair(data: CreateSqlPairInput!): SqlPair!

    """
    Updates an existing SQL-pair's question or SQL. Only provided fields are changed.
    """
    updateSqlPair(
      where: SqlPairWhereUniqueInput!
      data: UpdateSqlPairInput!
    ): SqlPair!

    """
    Permanently deletes a SQL-pair.
    """
    deleteSqlPair(where: SqlPairWhereUniqueInput!): Boolean!

    """
    Uses the AI to generate a natural-language question from a SQL query.
    Useful for auto-filling the question field when the user provides SQL first.
    Returns the generated question string.
    """
    generateQuestion(data: GenerateQuestionInput!): String!

    """
    Rewrites a SQL query that uses raw data source table names to instead use
    WrenAI's semantic model reference names. This makes the SQL portable and
    ensures it respects the defined join relationships.
    Returns the rewritten SQL string.
    """
    modelSubstitute(data: ModelSubstituteInput!): String!

    # ── Instructions ──────────────────────────────────────────────────────────

    """
    Creates a new instruction rule. Default instructions are sent with every query;
    non-default instructions are only applied when the user's question matches
    one of the specified question patterns.
    """
    createInstruction(data: CreateInstructionInput!): Instruction!

    """
    Updates an existing instruction. Only provided fields are changed.
    """
    updateInstruction(
      where: InstructionWhereInput!
      data: UpdateInstructionInput!
    ): Instruction!

    """
    Permanently deletes an instruction.
    """
    deleteInstruction(where: InstructionWhereInput!): Boolean!

    # ── OpenMetadata ──────────────────────────────────────────────────────────

    """
    Saves the OpenMetadata integration configuration for the current project,
    linking (or unlinking) a specific OM service to this project.
    """
    saveOpenMetadataConfig(data: OpenMetadataProjectConfigInput!): Boolean!

    """
    Imports the terms from one or more OpenMetadata glossaries as WrenAI instructions.
    Each glossary term becomes an instruction that guides SQL generation.
    Returns the list of newly created instructions.
    """
    importOpenMetadataGlossary(glossaryNames: [String!]!): [Instruction!]!

    """
    Force-syncs table and column descriptions from the linked OpenMetadata service
    into the corresponding WrenAI model metadata rows.
    Returns the number of model records that were updated.
    """
    resyncOpenMetadataDescriptions: Int!
  }
`;
