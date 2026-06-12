import type { NextApiRequest, NextApiResponse } from 'next';
import { components, serverConfig } from '@/common';
import { User } from '@server/repositories';
import { getSessionTokenFromRequest } from './authCookies';

/**
 * Validates the session cookie of a REST/streaming API request.
 * Returns the user when authenticated; otherwise responds 401 and
 * returns null. When auth is disabled it returns undefined and the
 * request proceeds as before.
 */
export const requireSession = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<User | null | undefined> => {
  if (!serverConfig.authEnabled) {
    return undefined;
  }
  const sessionToken = getSessionTokenFromRequest(req);
  const user = sessionToken
    ? await components.authService.validateSessionToken(sessionToken)
    : null;
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return user;
};
