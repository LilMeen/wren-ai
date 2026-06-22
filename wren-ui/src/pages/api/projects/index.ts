import type { NextApiRequest, NextApiResponse } from 'next';
import { components, serverConfig } from '@/common';
import { getSessionTokenFromRequest } from '@server/utils/authCookies';
import { getLogger } from '@server/utils';

const logger = getLogger('AUTH');
logger.level = 'debug';

/**
 * Lists all projects in the system for any authenticated user
 * (project access does not require membership in this phase).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authService, projectRepository, userRepository } = components;

  let currentUser = null;
  if (serverConfig.authEnabled) {
    const sessionToken = getSessionTokenFromRequest(req);
    currentUser = sessionToken
      ? await authService.validateSessionToken(sessionToken)
      : null;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
  }

  try {
    const projects = await projectRepository.findAll();
    const users = await userRepository.findAll();
    const emailByUserId = new Map(users.map((user) => [user.id, user.email]));

    const result = projects
      .sort(
        (a: any, b: any) =>
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime(),
      )
      .map((project: any) => ({
        id: project.id,
        displayName: project.displayName,
        type: project.type,
        sampleDataset: project.sampleDataset || null,
        ownerId: project.ownerId || null,
        ownerEmail: emailByUserId.get(project.ownerId) || null,
        isOwner: currentUser ? project.ownerId === currentUser.id : false,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }));
    return res.status(200).json({ projects: result });
  } catch (error: any) {
    logger.error(`List projects failed: ${error.stack || error.message}`);
    return res.status(500).json({ error: 'Failed to list projects' });
  }
}
