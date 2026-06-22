import { v4 as uuidv4 } from 'uuid';
import { IContext } from '../types/context';
import {
  OntologyDefinition,
  OntologyEntity,
  OntologyRelationship,
} from '../repositories/ontologyRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('OntologyResolver');
logger.level = 'debug';

// ensure every entity / relationship has a stable id for the UI
const withIds = (definition: OntologyDefinition): OntologyDefinition => ({
  entities: (definition.entities || []).map((e: OntologyEntity) => ({
    ...e,
    id: e.id || uuidv4(),
  })),
  relationships: (definition.relationships || []).map(
    (r: OntologyRelationship) => ({
      ...r,
      id: r.id || uuidv4(),
    }),
  ),
});

export class OntologyResolver {
  constructor() {
    this.getOntology = this.getOntology.bind(this);
    this.getOntologyRecommendationTask =
      this.getOntologyRecommendationTask.bind(this);
    this.generateOntologyRecommendations =
      this.generateOntologyRecommendations.bind(this);
    this.saveOntology = this.saveOntology.bind(this);
  }

  public async getOntology(_root: any, _arg: any, ctx: IContext) {
    const project = await ctx.projectService.getCurrentProject();
    const ontology = await ctx.ontologyService.getByProject(project.id);
    if (!ontology) return null;
    return {
      id: ontology.id,
      projectId: ontology.projectId,
      definition: ontology.definition
        ? withIds(ontology.definition)
        : { entities: [], relationships: [] },
      status: ontology.status,
      generatedBy: ontology.generatedBy,
    };
  }

  public async generateOntologyRecommendations(
    _root: any,
    _arg: any,
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    const { manifest } = await ctx.mdlService.makeCurrentModelMDL();
    const { queryId } = await ctx.wrenAIAdaptor.generateOntologyRecommendations(
      {
        manifest,
        projectId: String(project.id),
        configuration: { language: project.language },
      },
    );
    return { id: queryId };
  }

  public async getOntologyRecommendationTask(
    _root: any,
    arg: { taskId: string },
    ctx: IContext,
  ) {
    const { taskId } = arg;
    const result =
      await ctx.wrenAIAdaptor.getOntologyRecommendationResult(taskId);

    if (result.status !== 'finished' || !result.response) {
      return {
        status: result.status,
        definition: null,
        error: result.error || null,
      };
    }

    const definition = withIds({
      entities: (result.response.entities || []) as any,
      relationships: (result.response.relationships || []) as any,
    });

    return {
      status: result.status,
      definition,
      error: null,
    };
  }

  public async saveOntology(
    _root: any,
    arg: { data: OntologyDefinition },
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    const definition = withIds({
      entities: arg.data?.entities || [],
      relationships: arg.data?.relationships || [],
    });
    const saved = await ctx.ontologyService.save(project.id, {
      definition,
      generatedBy: 'user',
      status: 'active',
    });
    logger.debug(`Saved ontology for project ${project.id}`);
    return {
      id: saved.id,
      projectId: saved.projectId,
      definition: saved.definition,
      status: saved.status,
      generatedBy: saved.generatedBy,
    };
  }
}
