import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig } from '@server/config';

export const SESSION_COOKIE = 'wren_session';
export const REFRESH_COOKIE = 'wren_refresh';
export const PROJECT_COOKIE = 'wren_project';

interface CookieOptions {
  maxAgeSeconds?: number;
  httpOnly?: boolean;
  path?: string;
}

const serializeCookie = (
  name: string,
  value: string,
  options: CookieOptions = {},
): string => {
  const config = getConfig();
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);
  if (options.maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${options.maxAgeSeconds}`);
  }
  if (options.httpOnly !== false) {
    parts.push('HttpOnly');
  }
  parts.push('SameSite=Lax');
  if (config.authCookieSecure) {
    parts.push('Secure');
  }
  return parts.join('; ');
};

const appendSetCookie = (res: NextApiResponse, cookies: string[]) => {
  const existing = res.getHeader('Set-Cookie');
  const previous = existing
    ? Array.isArray(existing)
      ? existing.map(String)
      : [String(existing)]
    : [];
  res.setHeader('Set-Cookie', [...previous, ...cookies]);
};

export const setAuthCookies = (
  res: NextApiResponse,
  {
    sessionToken,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
  }: {
    sessionToken: string;
    refreshToken: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
  },
) => {
  appendSetCookie(res, [
    serializeCookie(SESSION_COOKIE, sessionToken, {
      maxAgeSeconds: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    }),
    serializeCookie(REFRESH_COOKIE, refreshToken, {
      maxAgeSeconds: Math.floor(
        (refreshExpiresAt.getTime() - Date.now()) / 1000,
      ),
    }),
  ]);
};

export const clearAuthCookies = (res: NextApiResponse) => {
  appendSetCookie(res, [
    serializeCookie(SESSION_COOKIE, '', { maxAgeSeconds: 0 }),
    serializeCookie(REFRESH_COOKIE, '', { maxAgeSeconds: 0 }),
    serializeCookie(PROJECT_COOKIE, '', { maxAgeSeconds: 0 }),
  ]);
};

export const setSelectedProjectCookie = (
  res: NextApiResponse,
  projectId: number,
) => {
  appendSetCookie(res, [
    serializeCookie(PROJECT_COOKIE, String(projectId), {
      // keep the selection for a year; it is re-validated on every request
      maxAgeSeconds: 365 * 24 * 60 * 60,
    }),
  ]);
};

export const getSessionTokenFromRequest = (
  req: NextApiRequest,
): string | undefined => {
  return req.cookies?.[SESSION_COOKIE] || undefined;
};

export const getRefreshTokenFromRequest = (
  req: NextApiRequest,
): string | undefined => {
  return req.cookies?.[REFRESH_COOKIE] || undefined;
};

export const getSelectedProjectIdFromRequest = (
  req: NextApiRequest,
): number | undefined => {
  const raw = req.cookies?.[PROJECT_COOKIE];
  if (!raw) return undefined;
  const projectId = parseInt(raw, 10);
  return Number.isNaN(projectId) ? undefined : projectId;
};
