import type { NextApiResponse } from 'next';
import { IConfig } from '@server/config';
import {
  IIbisAdaptor,
  IWrenAIAdaptor,
  IWrenEngineAdaptor,
} from '@server/adaptors';
import {
  IModelColumnRepository,
  IModelNestedColumnRepository,
  IModelRepository,
  IProjectRepository,
  IRelationRepository,
  IViewRepository,
  ILearningRepository,
  ISchemaChangeRepository,
  IDeployLogRepository,
  IDashboardRepository,
  IDashboardItemRepository,
  ISqlPairRepository,
  IInstructionRepository,
  IApiHistoryRepository,
  IDashboardItemRefreshJobRepository,
  IOntologyRepository,
  IUserRepository,
  User,
} from '@server/repositories';
import {
  IQueryService,
  IAskingService,
  IDeployService,
  IModelService,
  IMDLService,
  IProjectService,
  IDashboardService,
  IInstructionService,
  IOntologyService,
} from '@server/services';
import { ITelemetry } from '@server/telemetry/telemetry';
import {
  ProjectRecommendQuestionBackgroundTracker,
  ThreadRecommendQuestionBackgroundTracker,
  DashboardCacheBackgroundTracker,
} from '@server/backgrounds';
import { ISqlPairService } from '../services/sqlPairService';

export interface IContext {
  config: IConfig;
  // telemetry
  telemetry: ITelemetry;

  // authenticated user of the current request (null when not signed in)
  currentUser?: User | null;

  // raw response of the current request; used to set cookies (e.g. selecting
  // the newly created project). Absent for non-HTTP callers / background jobs.
  res?: NextApiResponse;

  // adaptor
  wrenEngineAdaptor: IWrenEngineAdaptor;
  ibisServerAdaptor: IIbisAdaptor;
  wrenAIAdaptor: IWrenAIAdaptor;

  // services
  projectService: IProjectService;
  modelService: IModelService;
  mdlService: IMDLService;
  deployService: IDeployService;
  askingService: IAskingService;
  queryService: IQueryService;
  dashboardService: IDashboardService;
  sqlPairService: ISqlPairService;
  instructionService: IInstructionService;
  ontologyService: IOntologyService;

  // repository
  projectRepository: IProjectRepository;
  modelRepository: IModelRepository;
  modelColumnRepository: IModelColumnRepository;
  modelNestedColumnRepository: IModelNestedColumnRepository;
  relationRepository: IRelationRepository;
  viewRepository: IViewRepository;
  deployRepository: IDeployLogRepository;
  schemaChangeRepository: ISchemaChangeRepository;
  learningRepository: ILearningRepository;
  dashboardRepository: IDashboardRepository;
  dashboardItemRepository: IDashboardItemRepository;
  sqlPairRepository: ISqlPairRepository;
  instructionRepository: IInstructionRepository;
  apiHistoryRepository: IApiHistoryRepository;
  userRepository: IUserRepository;
  dashboardItemRefreshJobRepository: IDashboardItemRefreshJobRepository;
  ontologyRepository: IOntologyRepository;

  // background trackers
  projectRecommendQuestionBackgroundTracker: ProjectRecommendQuestionBackgroundTracker;
  threadRecommendQuestionBackgroundTracker: ThreadRecommendQuestionBackgroundTracker;
  dashboardCacheBackgroundTracker: DashboardCacheBackgroundTracker;
}
