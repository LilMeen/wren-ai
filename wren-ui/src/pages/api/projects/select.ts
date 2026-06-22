import type { NextApiRequest, NextApiResponse } from 'next';
import { components, serverConfig } from '@/common';
import {
  getSessionTokenFromRequest,
  setSelectedProjectCookie,
} from '@server/utils/authCookies';
import { runWithAuthContext } from '@server/utils/authStorage';
import { getLogger } from '@server/utils';

const logger = getLogger('AUTH');
logger.level = 'debug';

/**
 * Selects the project the current user wants to work in. The selection is
 * stored in an httpOnly cookie and re-validated on every request.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    authService,
    projectRepository,
    mdlService,
    deployService,
    ontologyService,
  } = components;

  if (serverConfig.authEnabled) {
    const sessionToken = getSessionTokenFromRequest(req);
    const currentUser = sessionToken
      ? await authService.validateSessionToken(sessionToken)
      : null;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
  }

  try {
    const projectId = parseInt(req.body?.projectId, 10);
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const project = await projectRepository.findOneBy({ id: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    setSelectedProjectCookie(res, project.id);

    // Re-index the selected project's MDL into the AI service before returning.
    //
    // The AI service keeps every project's semantic documents in *shared*
    // Qdrant collections, separated only by a `project_id` payload field, and
    // retrieval filters strictly on that field. Those collections can lose a
    // project's documents independently of wren-ui's Postgres `deploy_log`:
    // the AI service recreates its indexes on startup when the embedding model
    // changes, and its startup force-deploy only re-indexes a single project.
    // When that happens the other projects still have a SUCCESS row in
    // `deploy_log` but zero documents in Qdrant, so retrieval returns nothing
    // and the LLM answers with no schema context ("no data / table not found").
    // That is exactly the failure seen when switching to an older project that
    // someone else created.
    //
    // A normal deploy short-circuits when the MDL hash already matches the last
    // `deploy_log` entry, so it would trust the stale log and never re-index the
    // missing documents. We therefore FORCE the deploy here to guarantee the
    // selected project is actually present in the AI service, and AWAIT it so
    // the project is queryable by the time the user lands on it. A deploy
    // failure must never block switching, so it is swallowed and logged.
    await runWithAuthContext({ selectedProjectId: project.id }, async () => {
      try {
        const { manifest } = await mdlService.makeCurrentModelMDL();
        // Enrich with ontology exactly like the `deploy` GraphQL resolver, so
        // the re-indexed semantic model matches what the modeling flow deploys
        // (and the computed hash stays consistent across both paths).
        const ontology = await ontologyService.getByProject(project.id);
        const enrichedManifest = ontologyService.applyOntologyToManifest(
          manifest,
          ontology,
        );
        await deployService.deploy(enrichedManifest, project.id, true);
      } catch (err: any) {
        logger.warn(
          `MDL re-deploy on project select failed for project ${project.id}: ${err.message}`,
        );
      }
    });

    return res.status(200).json({
      project: {
        id: project.id,
        displayName: project.displayName,
        type: project.type,
      },
    });
  } catch (error: any) {
    logger.error(`Select project failed: ${error.stack || error.message}`);
    return res.status(500).json({ error: 'Failed to select project' });
  }
}
