import type { NextApiRequest, NextApiResponse } from 'next';
import { components, serverConfig } from '@/common';
import {
  getSessionTokenFromRequest,
  setSelectedProjectCookie,
} from '@server/utils/authCookies';
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

  const { authService, projectRepository } = components;

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
