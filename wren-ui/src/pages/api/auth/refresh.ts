import type { NextApiRequest, NextApiResponse } from 'next';
import { components, serverConfig } from '@/common';
import { AuthError } from '@server/services/authService';
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setAuthCookies,
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
    const refreshToken = getRefreshTokenFromRequest(req);
    const result = await components.authService.refreshSession(refreshToken);
    setAuthCookies(res, result);
    return res.status(200).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
    });
  } catch (error: any) {
    clearAuthCookies(res);
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error(`Refresh session failed: ${error.stack || error.message}`);
    return res.status(500).json({ error: 'Failed to refresh session' });
  }
}
