import type { NextApiRequest, NextApiResponse } from 'next';
import { components, serverConfig } from '@/common';
import {
  clearAuthCookies,
  getSessionTokenFromRequest,
} from '@server/utils/authCookies';
import { getLogger } from '@server/utils';

const logger = getLogger('AUTH');
logger.level = 'debug';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!serverConfig.authEnabled) {
    return res.status(404).json({ error: 'Authentication is disabled' });
  }

  try {
    const sessionToken = getSessionTokenFromRequest(req);
    if (sessionToken) {
      await components.authService.signOut(sessionToken);
    }
  } catch (error: any) {
    // still clear cookies even if revoking fails
    logger.error(`Sign out failed: ${error.stack || error.message}`);
  }
  clearAuthCookies(res);
  return res.status(200).json({ success: true });
}
