import axios, { AxiosInstance } from 'axios';

import { getLogger } from '@server/utils/logger';
import { CompactColumn, CompactTable } from '@server/services';

const logger = getLogger('OpenMetadataAdaptor');
logger.level = 'debug';

/**
 * Per-project OpenMetadata config persisted on the project row. The infra-level
 * url/token live in server config (env), not here.
 */
export interface OPEN_METADATA_PROJECT_CONFIG {
  serviceName?: string | null;
  enabled: boolean;
}

export interface OMService {
  name: string;
  serviceType: string; // 'StarRocks', 'Trino', 'Hive', etc.
  description?: string;
  // connection details from OM (host, port, username) — password is masked
  hostPort?: string;
  username?: string;
}

export interface OMGlossary {
  name: string;
  displayName?: string;
  description?: string;
}

export interface OMGlossaryTerm {
  name: string;
  displayName?: string;
  description: string;
  synonyms?: string[];
  relatedTerms?: string[];
  fullyQualifiedName: string;
}

export interface IOpenMetadataAdaptor {
  listDatabaseServices(): Promise<OMService[]>;
  getTablesWithMetadata(serviceName?: string | null): Promise<CompactTable[]>;
  listGlossaries(): Promise<OMGlossary[]>;
  getGlossaryTerms(glossaryNames: string[]): Promise<OMGlossaryTerm[]>;
}

/**
 * OpenMetadata FQNs always start with the service name:
 *   4-part: service.catalog.schema.table  (Postgres, BigQuery, …)
 *   3-part: service.database.table        (MySQL, StarRocks, …)
 *
 * WrenAI / ibis uses the same names but WITHOUT the leading service segment.
 * Strip it whenever there are 3+ parts so both formats produce a name that
 * matches what ibis returns (catalog.schema.table or database.table).
 */
export function stripServicePrefix(fqn: string): string {
  const parts = fqn.split('.');
  return parts.length >= 3 ? parts.slice(1).join('.') : fqn;
}

export class OpenMetadataAdaptor implements IOpenMetadataAdaptor {
  private readonly client: AxiosInstance;

  constructor({ url, token }: { url: string; token: string }) {
    this.client = axios.create({
      baseURL: url.replace(/\/+$/, ''),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  public async listDatabaseServices(): Promise<OMService[]> {
    try {
      const res = await this.client.get('/api/v1/services/databaseServices', {
        params: { limit: 50, fields: 'connection' },
      });
      const services = res.data?.data || [];
      return services.map((service: any) => {
        const connConfig = service?.connection?.config || {};
        return {
          name: service.name,
          serviceType: service.serviceType,
          description: service.description,
          hostPort: connConfig.hostPort,
          username: connConfig.username,
        } as OMService;
      });
    } catch (e) {
      logger.warn(`Failed to list OpenMetadata services: ${this.errMsg(e)}`);
      throw e;
    }
  }

  public async getTablesWithMetadata(
    serviceName?: string | null,
  ): Promise<CompactTable[]> {
    try {
      const params: Record<string, any> = {
        limit: 200,
        fields: 'columns',
      };
      if (serviceName) {
        params.service = serviceName;
      }
      const res = await this.client.get('/api/v1/tables', { params });
      const tables = res.data?.data || [];
      return tables.map((table: any) => this.toCompactTable(table));
    } catch (e) {
      logger.warn(`Failed to get OpenMetadata tables: ${this.errMsg(e)}`);
      throw e;
    }
  }

  public async listGlossaries(): Promise<OMGlossary[]> {
    try {
      const res = await this.client.get('/api/v1/glossaries', {
        params: { limit: 50 },
      });
      const glossaries = res.data?.data || [];
      return glossaries.map(
        (glossary: any) =>
          ({
            name: glossary.name,
            displayName: glossary.displayName,
            description: glossary.description,
          }) as OMGlossary,
      );
    } catch (e) {
      logger.warn(`Failed to list OpenMetadata glossaries: ${this.errMsg(e)}`);
      throw e;
    }
  }

  public async getGlossaryTerms(
    glossaryNames: string[],
  ): Promise<OMGlossaryTerm[]> {
    if (!glossaryNames?.length) {
      return [];
    }
    try {
      const res = await this.client.get('/api/v1/glossaryTerms', {
        params: {
          limit: 200,
          fields: 'synonyms,relatedTerms',
        },
      });
      const terms = res.data?.data || [];
      const wanted = new Set(glossaryNames);
      return terms
        .filter((term: any) => {
          // A term FQN is `glossaryName.term...`; keep only requested glossaries.
          const glossaryName = (term?.fullyQualifiedName || '').split('.')[0];
          return wanted.has(glossaryName) || wanted.has(term?.glossary?.name);
        })
        .map(
          (term: any) =>
            ({
              name: term.name,
              displayName: term.displayName,
              description: term.description,
              synonyms: term.synonyms || [],
              relatedTerms: (term.relatedTerms || [])
                .map((r: any) => r?.displayName || r?.name)
                .filter(Boolean),
              fullyQualifiedName: term.fullyQualifiedName,
            }) as OMGlossaryTerm,
        );
    } catch (e) {
      logger.warn(
        `Failed to get OpenMetadata glossary terms: ${this.errMsg(e)}`,
      );
      throw e;
    }
  }

  private toCompactTable(table: any): CompactTable {
    const name = table?.fullyQualifiedName
      ? stripServicePrefix(table.fullyQualifiedName)
      : table?.name;
    const properties: Record<string, any> = {};
    if (table?.description) {
      properties.description = table.description;
    }
    const columns: CompactColumn[] = (table?.columns || []).map((col: any) =>
      this.toCompactColumn(col),
    );
    return {
      name,
      columns,
      description: table?.description,
      properties,
    };
  }

  private toCompactColumn(col: any): CompactColumn {
    const properties: Record<string, any> = {};
    if (col?.description) {
      properties.description = col.description;
    }
    return {
      name: col?.name,
      type: col?.dataType || col?.dataTypeDisplay || 'string',
      notNull: false,
      description: col?.description,
      properties,
    };
  }

  private errMsg(e: any): string {
    return e?.response?.data
      ? JSON.stringify(e.response.data)
      : e?.message || String(e);
  }
}
