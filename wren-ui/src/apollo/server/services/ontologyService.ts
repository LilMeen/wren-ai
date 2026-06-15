import {
  IOntologyRepository,
  Ontology,
  OntologyDefinition,
} from '../repositories/ontologyRepository';
import { Manifest } from '../mdl/type';
import { getLogger } from '@server/utils';

const logger = getLogger('OntologyService');
logger.level = 'debug';

export interface SaveOntologyData {
  definition: OntologyDefinition;
  generatedBy?: string;
  status?: string;
}

export interface IOntologyService {
  getByProject(projectId: number): Promise<Ontology | null>;
  save(projectId: number, data: SaveOntologyData): Promise<Ontology>;
  applyOntologyToManifest(
    manifest: Manifest,
    ontology: Ontology | null,
  ): Manifest;
}

export class OntologyService implements IOntologyService {
  private ontologyRepository: IOntologyRepository;

  constructor({
    ontologyRepository,
  }: {
    ontologyRepository: IOntologyRepository;
  }) {
    this.ontologyRepository = ontologyRepository;
  }

  public async getByProject(projectId: number) {
    return this.ontologyRepository.findByProjectId(projectId);
  }

  public async save(projectId: number, data: SaveOntologyData) {
    return this.ontologyRepository.upsertByProjectId(projectId, {
      definition: data.definition,
      generatedBy: data.generatedBy ?? 'user',
      status: data.status ?? 'active',
    });
  }

  /**
   * Enrich the MDL manifest with business semantics from the ontology so the
   * deployed semantic model (indexed by the AI service) carries the ontology's
   * descriptions / display names. This is how the ontology influences answers
   * without touching the AI ask pipeline directly.
   *
   * No-op (returns the original manifest) when there is no ontology yet.
   */
  public applyOntologyToManifest(
    manifest: Manifest,
    ontology: Ontology | null,
  ): Manifest {
    if (!ontology?.definition) {
      return manifest;
    }
    const { entities = [], relationships = [] } = ontology.definition;
    if (entities.length === 0 && relationships.length === 0) {
      return manifest;
    }

    // index ontology entities/relationships for quick lookup
    const entityByModel = new Map(entities.map((e) => [e.sourceModel, e]));
    // map ordered pair of entity names -> relationship
    const relByEntities = new Map(
      relationships.map((r) => [`${r.fromEntity}__${r.toEntity}`, r]),
    );
    const entityNameByModel = new Map(
      entities.map((e) => [e.sourceModel, e.name]),
    );

    const enrichedModels = (manifest.models || []).map((model) => {
      const entity = entityByModel.get(model.name);
      if (!entity) return model;

      const enrichedColumns = (model.columns || []).map((column) => {
        const attribute = (entity.attributes || []).find(
          (a) => a.sourceColumn === column.name,
        );
        if (!attribute?.description) return column;
        return {
          ...column,
          properties: {
            ...(column.properties || {}),
            description: attribute.description,
          },
        };
      });

      return {
        ...model,
        columns: enrichedColumns,
        properties: {
          ...(model.properties || {}),
          // prefer ontology's semantic name / description, fall back to existing
          displayName:
            entity.displayName || entity.name || model.properties?.displayName,
          description: entity.description || model.properties?.description,
        },
      };
    });

    const enrichedRelationships = (manifest.relationships || []).map((rel) => {
      const models = rel.models || [];
      if (models.length !== 2) return rel;
      const [fromEntity, toEntity] = [
        entityNameByModel.get(models[0]),
        entityNameByModel.get(models[1]),
      ];
      const ontologyRel =
        relByEntities.get(`${fromEntity}__${toEntity}`) ||
        relByEntities.get(`${toEntity}__${fromEntity}`);
      if (!ontologyRel?.description) return rel;
      return {
        ...rel,
        properties: {
          ...(rel.properties || {}),
          description: ontologyRel.description,
        },
      };
    });

    logger.debug(
      `Applied ontology (project ${ontology.projectId}) to manifest: ` +
        `${entities.length} entities, ${relationships.length} relationships`,
    );

    return {
      ...manifest,
      models: enrichedModels,
      relationships: enrichedRelationships,
    };
  }
}
