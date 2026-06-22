/** 
    This class is responsible for handling the retrieval of metadata from the data source.
    For DuckDB, we control the access logic and directly query the WrenEngine.
    For PostgreSQL and BigQuery, we will use the Ibis server API.
 */

import { IIbisAdaptor } from '../adaptors/ibisAdaptor';
import { IWrenEngineAdaptor } from '../adaptors/wrenEngineAdaptor';
import { IOpenMetadataAdaptor } from '../adaptors/openMetadataAdaptor';
import { Project } from '../repositories';
import { DataSourceName } from '../types';
import { getLogger } from '@server/utils';

const logger = getLogger('MetadataService');
logger.level = 'debug';

export interface CompactColumn {
  name: string;
  type: string;
  notNull: boolean;
  description?: string;
  properties?: Record<string, any>;
  nestedColumns?: CompactColumn[];
}

export enum ConstraintType {
  PRIMARY_KEY = 'PRIMARY KEY',
  FOREIGN_KEY = 'FOREIGN KEY',
  UNIQUE = 'UNIQUE',
}

export interface CompactTable {
  name: string;
  columns: CompactColumn[];
  description?: string;
  properties?: Record<string, any>;
  primaryKey?: string;
}

export interface RecommendConstraint {
  constraintName: string;
  constraintType: ConstraintType;
  constraintTable: string;
  constraintColumn: string;
  constraintedTable: string;
  constraintedColumn: string;
}

export interface IDataSourceMetadataService {
  listTables(project: Project): Promise<CompactTable[]>;
  listConstraints(project: Project): Promise<RecommendConstraint[]>;
  getVersion(project: Project): Promise<string>;
}

export class DataSourceMetadataService implements IDataSourceMetadataService {
  private readonly ibisAdaptor: IIbisAdaptor;
  private readonly wrenEngineAdaptor: IWrenEngineAdaptor;
  // Optional: null when OpenMetadata env vars are not configured.
  private readonly openMetadataAdaptor: IOpenMetadataAdaptor | null;

  constructor({
    ibisAdaptor,
    wrenEngineAdaptor,
    openMetadataAdaptor,
  }: {
    ibisAdaptor: IIbisAdaptor;
    wrenEngineAdaptor: IWrenEngineAdaptor;
    openMetadataAdaptor?: IOpenMetadataAdaptor | null;
  }) {
    this.ibisAdaptor = ibisAdaptor;
    this.wrenEngineAdaptor = wrenEngineAdaptor;
    this.openMetadataAdaptor = openMetadataAdaptor || null;
  }

  public async listTables(project: Project): Promise<CompactTable[]> {
    const { type: dataSource, connectionInfo } = project;
    let tables: CompactTable[];
    if (dataSource === DataSourceName.DUCKDB) {
      tables = await this.wrenEngineAdaptor.listTables();
    } else {
      tables = await this.ibisAdaptor.getTables(dataSource, connectionInfo);
    }

    // Enrich with OpenMetadata descriptions when the adaptor exists and the
    // project opted in. Failures are non-fatal — the wizard keeps working with
    // the un-enriched tables.
    const omConfig = project.omConfig;
    if (this.openMetadataAdaptor && omConfig?.enabled === true) {
      try {
        const omTables = await this.openMetadataAdaptor.getTablesWithMetadata(
          omConfig.serviceName,
        );
        logger.debug(
          `OM tables fetched: ${omTables.length} (service=${omConfig.serviceName}). ` +
            `Sample OM names: ${omTables
              .slice(0, 3)
              .map((t) => t.name)
              .join(', ')}. ` +
            `Sample ibis names: ${tables
              .slice(0, 3)
              .map((t) => t.name)
              .join(', ')}`,
        );
        tables = this.mergeOMDescriptions(tables, omTables);
        const enriched = tables.filter((t) => t.description).length;
        logger.debug(
          `OM enrichment: ${enriched}/${tables.length} tables got descriptions`,
        );
      } catch (e) {
        logger.warn(`OM enrichment skipped: ${(e as Error).message}`);
      }
    }
    return tables;
  }

  private mergeOMDescriptions(
    tables: CompactTable[],
    omTables: CompactTable[],
  ): CompactTable[] {
    // omTable.name is already stripped by openMetadataAdaptor.toCompactTable.
    //
    // Matching strategy: ibis scopes to a specific catalog/database so its
    // table names may have fewer parts than the OM FQN after service-strip.
    // Example: OM = "default.sdp_golden.dim_date" (3 parts after stripping
    //          "SDP"), ibis = "sdp_golden.dim_date" (2 parts — the "default"
    //          catalog is implicit in the connection and not returned by ibis).
    // We build BOTH an exact-match map AND a suffix map so we catch all variants:
    //   • exact:  full match (e.g. Postgres catalog.schema.table)
    //   • suffix: Trino/StarRocks where ibis drops the leading catalog segment(s)
    const omExactMap = new Map(omTables.map((t) => [t.name, t]));
    const omSuffixMap = new Map<string, CompactTable>();
    for (const omTable of omTables) {
      const parts = omTable.name.split('.');
      for (let i = 1; i < parts.length; i++) {
        const suffix = parts.slice(i).join('.');
        if (!omSuffixMap.has(suffix)) {
          omSuffixMap.set(suffix, omTable);
        }
      }
    }
    return tables.map((table) => {
      const omTable = omExactMap.get(table.name) ?? omSuffixMap.get(table.name);
      if (!omTable) return table;
      return {
        ...table,
        description: omTable.description || table.description,
        properties: { ...table.properties, ...omTable.properties },
        columns: table.columns.map((col) => {
          const omCol = omTable.columns?.find((c) => c.name === col.name);
          if (!omCol?.description) return col;
          return {
            ...col,
            description: omCol.description,
            properties: {
              ...col.properties,
              description: omCol.description,
            },
          };
        }),
      };
    });
  }

  public async listConstraints(
    project: Project,
  ): Promise<RecommendConstraint[]> {
    const { type: dataSource, connectionInfo } = project;
    if (dataSource === DataSourceName.DUCKDB) {
      return [];
    }
    return await this.ibisAdaptor.getConstraints(dataSource, connectionInfo);
  }

  public async getVersion(project: Project): Promise<string> {
    const { type: dataSource, connectionInfo } = project;
    return await this.ibisAdaptor.getVersion(dataSource, connectionInfo);
  }
}
