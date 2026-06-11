import GraphQLJSON from 'graphql-type-json';
import { ProjectResolver } from './resolvers/projectResolver';
import { ModelResolver } from './resolvers/modelResolver';
import { AskingResolver } from './resolvers/askingResolver';
import { DiagramResolver } from './resolvers/diagramResolver';
import { LearningResolver } from './resolvers/learningResolver';
import { DashboardResolver } from './resolvers/dashboardResolver';
import { SqlPairResolver } from './resolvers/sqlPairResolver';
import { InstructionResolver } from './resolvers/instructionResolver';
import { ApiHistoryResolver } from './resolvers/apiHistoryResolver';
import { AuthResolver } from './resolvers/authResolver';
import { convertColumnType } from '@server/utils';
import { requireDev } from './utils/auth';
import { DialectSQLScalar } from './scalars';

const projectResolver = new ProjectResolver();
const modelResolver = new ModelResolver();
const askingResolver = new AskingResolver();
const diagramResolver = new DiagramResolver();
const learningResolver = new LearningResolver();
const dashboardResolver = new DashboardResolver();
const sqlPairResolver = new SqlPairResolver();
const instructionResolver = new InstructionResolver();
const apiHistoryResolver = new ApiHistoryResolver();
const authResolver = new AuthResolver();
const devOnly =
  (resolver: any) => async (root: any, args: any, ctx: any, info: any) => {
    requireDev(ctx);
    return resolver(root, args, ctx, info);
  };

const resolvers = {
  JSON: GraphQLJSON,
  DialectSQL: DialectSQLScalar,
  Query: {
    currentUser: authResolver.currentUser,
    projects: projectResolver.listProjects,
    listDataSourceTables: projectResolver.listDataSourceTables,
    autoGenerateRelation: projectResolver.autoGenerateRelation,
    listModels: modelResolver.listModels,
    model: modelResolver.getModel,
    onboardingStatus: projectResolver.getOnboardingStatus,
    modelSync: modelResolver.checkModelSync,
    diagram: diagramResolver.getDiagram,
    schemaChange: projectResolver.getSchemaChange,

    // Ask
    askingTask: askingResolver.getAskingTask,
    suggestedQuestions: askingResolver.getSuggestedQuestions,
    instantRecommendedQuestions: askingResolver.getInstantRecommendedQuestions,

    // Adjustment
    adjustmentTask: askingResolver.getAdjustmentTask,

    // Thread
    thread: askingResolver.getThread,
    threads: askingResolver.listThreads,
    threadResponse: askingResolver.getResponse,
    nativeSql: modelResolver.getNativeSql,

    // Views
    listViews: modelResolver.listViews,
    view: modelResolver.getView,

    // Settings
    settings: projectResolver.getSettings,
    getMDL: modelResolver.getMDL,

    // Learning
    learningRecord: learningResolver.getLearningRecord,

    // Recommendation questions
    getThreadRecommendationQuestions:
      askingResolver.getThreadRecommendationQuestions,
    getProjectRecommendationQuestions:
      projectResolver.getProjectRecommendationQuestions,

    // Dashboard
    dashboardItems: dashboardResolver.getDashboardItems,
    dashboard: dashboardResolver.getDashboard,

    // SQL Pairs
    sqlPairs: sqlPairResolver.getProjectSqlPairs,
    // Instructions
    instructions: instructionResolver.getInstructions,

    // API History
    apiHistory: apiHistoryResolver.getApiHistory,
  },
  Mutation: {
    signUp: authResolver.signUp,
    signIn: authResolver.signIn,
    refreshSession: authResolver.refreshSession,
    logout: authResolver.logout,
    deploy: devOnly(modelResolver.deploy),
    saveDataSource: devOnly(projectResolver.saveDataSource),
    startSampleDataset: devOnly(projectResolver.startSampleDataset),
    saveTables: devOnly(projectResolver.saveTables),
    saveRelations: devOnly(projectResolver.saveRelations),
    createModel: devOnly(modelResolver.createModel),
    updateModel: devOnly(modelResolver.updateModel),
    deleteModel: devOnly(modelResolver.deleteModel),
    previewModelData: modelResolver.previewModelData,
    updateModelMetadata: devOnly(modelResolver.updateModelMetadata),
    triggerDataSourceDetection: devOnly(
      projectResolver.triggerDataSourceDetection,
    ),
    resolveSchemaChange: devOnly(projectResolver.resolveSchemaChange),

    // calculated field
    createCalculatedField: devOnly(modelResolver.createCalculatedField),
    validateCalculatedField: devOnly(modelResolver.validateCalculatedField),
    updateCalculatedField: devOnly(modelResolver.updateCalculatedField),
    deleteCalculatedField: devOnly(modelResolver.deleteCalculatedField),

    // relation
    createRelation: devOnly(modelResolver.createRelation),
    updateRelation: devOnly(modelResolver.updateRelation),
    deleteRelation: devOnly(modelResolver.deleteRelation),

    // Ask
    createAskingTask: askingResolver.createAskingTask,
    cancelAskingTask: askingResolver.cancelAskingTask,
    createInstantRecommendedQuestions:
      askingResolver.createInstantRecommendedQuestions,
    rerunAskingTask: askingResolver.rerunAskingTask,

    // Adjustment
    adjustThreadResponse: askingResolver.adjustThreadResponse,
    cancelAdjustmentTask: askingResolver.cancelAdjustThreadResponseAnswer,
    rerunAdjustmentTask: askingResolver.rerunAdjustThreadResponseAnswer,

    // Thread
    createThread: askingResolver.createThread,
    updateThread: askingResolver.updateThread,
    deleteThread: askingResolver.deleteThread,
    createThreadResponse: askingResolver.createThreadResponse,
    updateThreadResponse: askingResolver.updateThreadResponse,
    previewData: askingResolver.previewData,
    previewBreakdownData: askingResolver.previewBreakdownData,

    // Generate Thread Response Breakdown
    generateThreadResponseBreakdown:
      askingResolver.generateThreadResponseBreakdown,

    // Generate Thread Response Answer
    generateThreadResponseAnswer: askingResolver.generateThreadResponseAnswer,

    // Generate Thread Response Chart
    generateThreadResponseChart: askingResolver.generateThreadResponseChart,

    // Adjust Thread Response Chart
    adjustThreadResponseChart: askingResolver.adjustThreadResponseChart,

    // Views
    createView: devOnly(modelResolver.createView),
    deleteView: devOnly(modelResolver.deleteView),
    previewViewData: modelResolver.previewViewData,
    validateView: devOnly(modelResolver.validateView),
    updateViewMetadata: devOnly(modelResolver.updateViewMetadata),

    // Settings
    resetCurrentProject: devOnly(projectResolver.resetCurrentProject),
    updateCurrentProject: devOnly(projectResolver.updateCurrentProject),
    updateDataSource: devOnly(projectResolver.updateDataSource),

    // preview
    previewSql: modelResolver.previewSql,

    // Learning
    saveLearningRecord: learningResolver.saveLearningRecord,

    // Recommendation questions
    generateThreadRecommendationQuestions:
      askingResolver.generateThreadRecommendationQuestions,
    generateProjectRecommendationQuestions: devOnly(
      askingResolver.generateProjectRecommendationQuestions,
    ),

    // Dashboard
    updateDashboardItemLayouts: devOnly(
      dashboardResolver.updateDashboardItemLayouts,
    ),
    createDashboardItem: devOnly(dashboardResolver.createDashboardItem),
    updateDashboardItem: devOnly(dashboardResolver.updateDashboardItem),
    deleteDashboardItem: devOnly(dashboardResolver.deleteDashboardItem),
    previewItemSQL: dashboardResolver.previewItemSQL,
    setDashboardSchedule: devOnly(dashboardResolver.setDashboardSchedule),

    // SQL Pairs
    createSqlPair: devOnly(sqlPairResolver.createSqlPair),
    updateSqlPair: devOnly(sqlPairResolver.updateSqlPair),
    deleteSqlPair: devOnly(sqlPairResolver.deleteSqlPair),
    generateQuestion: sqlPairResolver.generateQuestion,
    modelSubstitute: sqlPairResolver.modelSubstitute,
    // Instructions
    createInstruction: devOnly(instructionResolver.createInstruction),
    updateInstruction: devOnly(instructionResolver.updateInstruction),
    deleteInstruction: devOnly(instructionResolver.deleteInstruction),
  },
  ThreadResponse: askingResolver.getThreadResponseNestedResolver(),
  DetailStep: askingResolver.getDetailStepNestedResolver(),
  ResultCandidate: askingResolver.getResultCandidateNestedResolver(),

  // Handle struct type to record for UI
  DiagramModelField: { type: convertColumnType },
  DiagramModelNestedField: { type: convertColumnType },
  CompactColumn: { type: convertColumnType },
  FieldInfo: { type: convertColumnType },
  DetailedColumn: { type: convertColumnType },
  DetailedNestedColumn: { type: convertColumnType },
  DetailedChangeColumn: { type: convertColumnType },

  // Add this line to include the SqlPair nested resolver
  SqlPair: sqlPairResolver.getSqlPairNestedResolver(),

  // Add ApiHistoryResponse nested resolvers
  ApiHistoryResponse: apiHistoryResolver.getApiHistoryNestedResolver(),
};

export default resolvers;
