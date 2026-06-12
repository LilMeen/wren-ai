import type { NextApiRequest, NextApiResponse } from 'next';
import { components, serverConfig } from '@/common';
import {
  getSelectedProjectIdFromRequest,
  getSessionTokenFromRequest,
} from '@server/utils/authCookies';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!serverConfig.authEnabled) {
    return res.status(200).json({ authEnabled: false, user: null });
  }

  const sessionToken = getSessionTokenFromRequest(req);
  const user = sessionToken
    ? await components.authService.validateSessionToken(sessionToken)
    : null;
  if (!user) {
    return res
      .status(401)
      .json({ authEnabled: true, user: null, error: 'Not authenticated' });
  }

  return res.status(200).json({
    authEnabled: true,
    user: { id: user.id, email: user.email, role: user.role },
    selectedProjectId: getSelectedProjectIdFromRequest(req) ?? null,
  });
}
