import { AuthenticationError, ForbiddenError } from 'apollo-server-core';
import { UserRole } from '../repositories/userRepository';
import { IContext } from '../types';

/**
 * Mutations that modify project configuration or semantic definitions.
 * Only `dev` (project owner) and `admin` roles may run them; normal `user`
 * accounts can chat and read but never alter project setup.
 */
// These create a brand-new project — no existing project to be the owner of.
const PROJECT_CREATION_MUTATIONS = new Set([
  'saveDataSource',
  'startSampleDataset',
]);

const DEV_ONLY_MUTATIONS = new Set([
  // project / data source
  'deploy',
  'saveDataSource',
  'startSampleDataset',
  'saveTables',
  'saveRelations',
  'triggerDataSourceDetection',
  'resolveSchemaChange',
  'resetCurrentProject',
  'updateCurrentProject',
  'updateDataSource',
  // models
  'createModel',
  'updateModel',
  'deleteModel',
  'updateModelMetadata',
  // calculated fields
  'createCalculatedField',
  'updateCalculatedField',
  'deleteCalculatedField',
  // relations
  'createRelation',
  'updateRelation',
  'deleteRelation',
  // views
  'createView',
  'deleteView',
  'validateView',
  'updateViewMetadata',
  // dashboards
  'updateDashboardItemLayouts',
  'createDashboardItem',
  'updateDashboardItem',
  'deleteDashboardItem',
  'setDashboardSchedule',
  // sql pairs
  'createSqlPair',
  'updateSqlPair',
  'deleteSqlPair',
  // instructions
  'createInstruction',
  'updateInstruction',
  'deleteInstruction',
]);

type ResolverFn = (
  root: any,
  args: any,
  ctx: IContext,
  info: any,
) => Promise<any> | any;

const guardResolver = (
  fieldName: string,
  isMutation: boolean,
  resolve: ResolverFn,
): ResolverFn => {
  return async (root, args, ctx, info) => {
    // auth can be turned off entirely (e.g. for local debugging / e2e tests)
    if (!ctx.config.authEnabled) {
      return resolve(root, args, ctx, info);
    }

    const user = ctx.currentUser;
    if (!user) {
      throw new AuthenticationError('You must be signed in to continue.');
    }

    if (isMutation && DEV_ONLY_MUTATIONS.has(fieldName)) {
      if (user.role === UserRole.USER) {
        throw new ForbiddenError(
          'Only developers can modify project configuration.',
        );
      }

      // a dev can only manage projects they own (admin bypasses this check)
      if (
        user.role === UserRole.DEV &&
        !PROJECT_CREATION_MUTATIONS.has(fieldName)
      ) {
        let project = null;
        try {
          project = await ctx.projectService.getCurrentProject();
        } catch {
          // no project yet — allow
        }
        if (project && project.ownerId && project.ownerId !== user.id) {
          throw new ForbiddenError(
            'Only the project owner can modify this project.',
          );
        }
      }
    }

    return resolve(root, args, ctx, info);
  };
};

/**
 * Wraps every Query/Mutation resolver with authentication & authorization
 * checks. Nested type resolvers are left untouched: they can only be reached
 * through a guarded root field.
 */
export const applyAuthGuard = (resolvers: Record<string, any>) => {
  const guarded = { ...resolvers };
  for (const operationType of ['Query', 'Mutation']) {
    if (!guarded[operationType]) continue;
    const isMutation = operationType === 'Mutation';
    guarded[operationType] = Object.fromEntries(
      Object.entries(guarded[operationType]).map(([fieldName, resolve]) => [
        fieldName,
        guardResolver(fieldName, isMutation, resolve as ResolverFn),
      ]),
    );
  }
  return guarded;
};
