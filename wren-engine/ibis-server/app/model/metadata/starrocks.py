import re

from loguru import logger

from app.model import StarRocksConnectionInfo
from app.model.data_source import DataSource
from app.model.error import ErrorCode, WrenError
from app.model.metadata.dto import (
    Catalog,
    Column,
    Constraint,
    RustWrenEngineColumnType,
    Table,
    TableProperties,
)
from app.model.metadata.metadata import Metadata

# StarRocks type mapping
# Reference: https://docs.starrocks.io/docs/sql-reference/data-types/
STARROCKS_TYPE_MAPPING = {
    # ── String Types ────────────────────────────
    "char":      RustWrenEngineColumnType.CHAR,
    "varchar":   RustWrenEngineColumnType.VARCHAR,
    "string":    RustWrenEngineColumnType.VARCHAR,
    "text":      RustWrenEngineColumnType.TEXT,
    # ── Numeric Types ───────────────────────────
    "tinyint":   RustWrenEngineColumnType.TINYINT,
    "smallint":  RustWrenEngineColumnType.SMALLINT,
    "int":       RustWrenEngineColumnType.INTEGER,
    "integer":   RustWrenEngineColumnType.INTEGER,
    "mediumint": RustWrenEngineColumnType.INTEGER,
    "bigint":    RustWrenEngineColumnType.BIGINT,
    "largeint":  RustWrenEngineColumnType.BIGINT,  # 128-bit → 64-bit, may truncate
    # ── Boolean ─────────────────────────────────
    "boolean":   RustWrenEngineColumnType.BOOL,
    "bool":      RustWrenEngineColumnType.BOOL,
    # ── Decimal Types ───────────────────────────
    "float":     RustWrenEngineColumnType.FLOAT8,
    "double":    RustWrenEngineColumnType.DOUBLE,
    "decimal":   RustWrenEngineColumnType.DECIMAL,
    "decimalv3": RustWrenEngineColumnType.DECIMAL,
    "numeric":   RustWrenEngineColumnType.NUMERIC,
    # ── Date/Time Types ─────────────────────────
    "date":      RustWrenEngineColumnType.DATE,
    "datetime":  RustWrenEngineColumnType.TIMESTAMP,
    "timestamp": RustWrenEngineColumnType.TIMESTAMPTZ,
    # ── JSON / Semi-structured ───────────────────
    "json":      RustWrenEngineColumnType.JSON,
    # ── Complex Types ───────────────────────────
    "array":     RustWrenEngineColumnType.JSON,
    "map":       RustWrenEngineColumnType.JSON,
    "struct":    RustWrenEngineColumnType.JSON,
    # ── StarRocks-specific aggregate types ──────
    "hll":        RustWrenEngineColumnType.VARCHAR,
    "bitmap":     RustWrenEngineColumnType.VARCHAR,
    "percentile": RustWrenEngineColumnType.VARCHAR,
    # NOTE: 'variant', 'agg_state', 'quantile_state' are Doris-specific — NOT in StarRocks
}


class StarRocksMetadata(Metadata):
    def __init__(self, connection_info: StarRocksConnectionInfo):
        super().__init__(connection_info)
        self.connection = DataSource.starrocks.get_connection(connection_info)
        self.database = connection_info.database.get_secret_value()

    def get_table_list(self) -> list[Table]:
        """Fetch tables from ALL catalogs discovered via SHOW CATALOGS."""
        catalogs = self._get_catalog_names()
        unique_tables = {}

        for catalog in catalogs:
            try:
                self._validate_catalog_name(catalog)
            except ValueError as e:
                logger.warning(f"Skipping invalid catalog name: {e}")
                continue

            sql = f"""
                SELECT
                    c.TABLE_SCHEMA AS table_schema,
                    c.TABLE_NAME AS table_name,
                    c.COLUMN_NAME AS column_name,
                    c.COLUMN_TYPE AS data_type,
                    c.IS_NULLABLE AS is_nullable,
                    c.COLUMN_KEY AS column_key,
                    c.COLUMN_COMMENT AS column_comment,
                    t.TABLE_COMMENT AS table_comment
                FROM {catalog}.information_schema.COLUMNS c
                JOIN {catalog}.information_schema.TABLES t
                    ON c.TABLE_SCHEMA = t.TABLE_SCHEMA
                    AND c.TABLE_NAME = t.TABLE_NAME
                WHERE c.TABLE_SCHEMA NOT IN (
                    'information_schema', '__internal_schema',
                    'mysql', 'performance_schema', 'sys'
                )
                AND t.TABLE_TYPE = 'BASE TABLE'
                ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION
            """
            try:
                response = (
                    self.connection.sql(sql).to_pandas().to_dict(orient="records")
                )
                for row in response:
                    full_name = self._format_compact_table_name(
                        catalog, row["table_schema"], row["table_name"]
                    )
                    if full_name not in unique_tables:
                        unique_tables[full_name] = Table(
                            name=full_name,
                            description=row["table_comment"],
                            columns=[],
                            properties=TableProperties(
                                schema=row["table_schema"],
                                catalog=catalog,
                                table=row["table_name"],
                            ),
                            primaryKey=None,
                        )
                    unique_tables[full_name].columns.append(
                        Column(
                            name=row["column_name"],
                            type=self._transform_column_type(row["data_type"]),
                            notNull=row["is_nullable"].lower() == "no",
                            description=row["column_comment"],
                            properties=None,
                        )
                    )
                    if row["column_key"] in ("PRI", "UNI"):
                        existing_pk = unique_tables[full_name].primaryKey
                        col = row["column_name"]
                        unique_tables[full_name].primaryKey = (
                            f"{existing_pk},{col}" if existing_pk else col
                        )
            except Exception as e:
                logger.warning(
                    f"[StarRocks] Catalog '{catalog}' cannot fetch tables: {e} "
                    f"— skipping this catalog, continuing with remaining catalogs."
                )

        return list(unique_tables.values())

    def get_constraints(self) -> list[Constraint]:
        # StarRocks does not support foreign key constraints.
        return []

    def get_schema_list(self, filter_info=None, limit=None) -> list[Catalog]:
        """Return Catalog objects, each containing its list of schemas."""
        catalog_names = self._get_catalog_names()
        result = []

        for catalog_name in catalog_names:
            try:
                self._validate_catalog_name(catalog_name)
            except ValueError as e:
                logger.warning(f"Skipping invalid catalog name: {e}")
                continue  # do not execute SQL with invalid catalog name

            sql = f"""
                SELECT SCHEMA_NAME
                FROM {catalog_name}.information_schema.SCHEMATA
                WHERE SCHEMA_NAME NOT IN (
                    'information_schema', '__internal_schema',
                    'mysql', 'performance_schema', 'sys'
                )
                ORDER BY SCHEMA_NAME
            """
            if limit is not None:
                try:
                    validated_limit = int(limit)
                except (TypeError, ValueError) as exc:
                    raise ValueError("limit must be an integer") from exc
                if validated_limit < 0:
                    raise ValueError("limit must be non-negative")
                sql += f" LIMIT {validated_limit}"

            try:
                response = self.connection.sql(sql).to_pandas()
                schemas = response["SCHEMA_NAME"].tolist()
                result.append(Catalog(name=catalog_name, schemas=schemas))
            except Exception as e:
                logger.warning(
                    f"[StarRocks] Catalog '{catalog_name}' cannot fetch schemas: {e} "
                    f"— skipping this catalog, continuing with remaining catalogs."
                )

        return result

    def get_version(self) -> str:
        return self.connection.sql("SELECT version()").to_pandas().iloc[0, 0]

    # ── Private helpers ──────────────────────────────────────────────────────

    def _get_catalog_names(self) -> list[str]:
        """Query StarRocks SHOW CATALOGS. Raises WrenError on failure."""
        try:
            response = self.connection.sql("SHOW CATALOGS").to_pandas()
            # Defensive column lookup — StarRocks may return 'CatalogName' or 'Catalog'
            # depending on version.
            col_name = next(
                (c for c in response.columns if c.lower() in ("catalogname", "catalog")),
                None,
            )
            if col_name is None:
                raise ValueError(
                    f"Cannot find catalog column in SHOW CATALOGS result, "
                    f"got columns: {response.columns.tolist()}"
                )
            return response[col_name].tolist()
        except WrenError:
            raise
        except Exception as e:
            raise WrenError(
                ErrorCode.GET_CONNECTION_ERROR,
                f"Failed to list StarRocks catalogs: {e}",
            ) from e

    @staticmethod
    def _validate_catalog_name(name: str) -> str:
        """Whitelist validate catalog name to prevent SQL injection."""
        if not re.fullmatch(r"[a-zA-Z0-9_\-]+", name):
            raise ValueError(f"Invalid catalog name: {name!r}")
        return name

    @staticmethod
    def _format_compact_table_name(catalog: str, schema: str, table: str) -> str:
        # Always use full catalog.schema.table format to guarantee uniqueness
        return f"{catalog}.{schema}.{table}"

    def _format_constraint_name(
        self, table_name, column_name, referenced_table_name, referenced_column_name
    ):
        return f"{table_name}_{column_name}_{referenced_table_name}_{referenced_column_name}"

    def _transform_column_type(self, data_type: str) -> RustWrenEngineColumnType:
        """Strip precision/params then lookup STARROCKS_TYPE_MAPPING.

        Examples:
            "decimal(18,4)"  → "decimal"  → DECIMAL
            "varchar(255)"   → "varchar"  → VARCHAR
            "array<int>"     → "array"    → JSON
            "BIGINT"         → "bigint"   → BIGINT
        """
        # Strip everything after (, < or space — get base type in lowercase
        base_type = re.split(r"[(<\s]", data_type.lower())[0].strip()
        mapped_type = STARROCKS_TYPE_MAPPING.get(
            base_type, RustWrenEngineColumnType.UNKNOWN
        )
        if mapped_type == RustWrenEngineColumnType.UNKNOWN:
            logger.warning(f"Unknown StarRocks data type: {data_type!r}")
        return mapped_type
