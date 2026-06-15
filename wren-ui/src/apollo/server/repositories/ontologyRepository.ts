import { Knex } from 'knex';
import {
  camelCase,
  isPlainObject,
  mapKeys,
  mapValues,
  snakeCase,
} from 'lodash';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface OntologyAttribute {
  name: string; // semantic attribute name
  sourceColumn: string; // the model column referenceName this maps to
  description?: string;
}

export interface OntologyEntity {
  id: string;
  name: string; // semantic name of the table/entity
  displayName?: string;
  description?: string;
  sourceModel: string; // the model referenceName this entity maps to
  attributes?: OntologyAttribute[];
}

export interface OntologyRelationship {
  id: string;
  name: string; // business name of the relationship
  fromEntity: string; // entity name
  toEntity: string; // entity name
  type: string; // ONE_TO_ONE | ONE_TO_MANY | MANY_TO_ONE
  description?: string;
  sourceRelation?: string; // the physical relation name, if any
}

export interface OntologyDefinition {
  entities: OntologyEntity[];
  relationships: OntologyRelationship[];
}

export interface Ontology {
  id: number; // ID
  projectId: number; // Reference to project.id
  definition: OntologyDefinition | null; // The ontology graph (JSON)
  status: string; // draft | active
  generatedBy: string | null; // ai | user
}

export interface IOntologyRepository extends IBasicRepository<Ontology> {
  findByProjectId(projectId: number): Promise<Ontology | null>;
  upsertByProjectId(
    projectId: number,
    data: Partial<Ontology>,
  ): Promise<Ontology>;
}

export class OntologyRepository
  extends BaseRepository<Ontology>
  implements IOntologyRepository
{
  private readonly jsonbColumns = ['definition'];

  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'ontology' });
  }

  public async findByProjectId(projectId: number) {
    return this.findOneBy({ projectId });
  }

  public async upsertByProjectId(projectId: number, data: Partial<Ontology>) {
    const existing = await this.findByProjectId(projectId);
    if (existing) {
      return this.updateOne(existing.id, data);
    }
    return this.createOne({ ...data, projectId });
  }

  protected override transformToDBData = (data: Partial<Ontology>) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const transformed = mapValues(data, (value, key) => {
      if (this.jsonbColumns.includes(key)) {
        return value === null || value === undefined
          ? value
          : JSON.stringify(value);
      }
      return value;
    });
    return mapKeys(transformed, (_value, key) => snakeCase(key));
  };

  protected override transformFromDBData = (data: any): Ontology => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const camelCaseData = mapKeys(data, (_value, key) => camelCase(key));
    const formattedData = mapValues(camelCaseData, (value, key) => {
      if (this.jsonbColumns.includes(key)) {
        // Sqlite returns string, PG returns parsed JSON object
        if (typeof value === 'string') {
          return value ? JSON.parse(value) : value;
        }
        return value;
      }
      return value;
    }) as Ontology;
    return formattedData;
  };
}
