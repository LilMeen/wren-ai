import * as crypto from 'crypto';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { components, serverConfig } from '@/common';
import { User } from '@server/repositories';
import { runWithAuthContext } from './authStorage';
import {
  getSessionTokenFromRequest,
  getSelectedProjectIdFromRequest,
} from './authCookies';

/** Header carrying the shared secret for trusted service-to-service calls. */
export const INTERNAL_SECRET_HEADER = 'x-wren-internal-secret';

/**
 * Returns true when the request carries the configured internal API secret.
 * Used by backend services (e.g. wren-ai-service dry-running SQL) that cannot
 * hold a user session. Disabled unless WREN_INTERNAL_API_SECRET is set.
 */
export const isInternalServiceRequest = (req: NextApiRequest): boolean => {
  const secret = serverConfig.internalApiSecret;
  const provided = req.headers[INTERNAL_SECRET_HEADER];
  if (!secret || typeof provided !== 'string' || provided.length === 0) {
    return false;
  }
  const providedBuffer = Buffer.from(provided);
  const secretBuffer = Buffer.from(secret);
  return (
    providedBuffer.length === secretBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, secretBuffer)
  );
};

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

/**
 * Wraps a REST API handler with authentication: the caller must present a
 * valid session cookie (or the internal service secret). The handler then
 * runs inside the auth context so `getCurrentProject()` resolves the
 * project selected by that user, exactly like GraphQL requests do.
 */
export const withApiAuth = (handler: NextApiHandler): NextApiHandler => {
  return async (req, res) => {
    if (!serverConfig.authEnabled || isInternalServiceRequest(req)) {
      return handler(req, res);
    }
    const user = await requireSession(req, res);
    if (user === null) return;
    const selectedProjectId = getSelectedProjectIdFromRequest(req);
    return runWithAuthContext({ user, selectedProjectId }, async () =>
      handler(req, res),
    );
  };
};
