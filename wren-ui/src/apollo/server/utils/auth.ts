import { NextApiRequest, NextApiResponse } from 'next';
import {
  SESSION_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  PublicUser,
} from '../services/authService';
import { IContext } from '../types';

export const parseCookies = (cookieHeader?: string) => {
  return (cookieHeader || '')
    .split(';')
    .reduce<Record<string, string>>((acc, part) => {
      const [name, ...value] = part.trim().split('=');
      if (name) {
        acc[name] = decodeURIComponent(value.join('='));
      }
      return acc;
    }, {});
};

const cookieOptions = 'HttpOnly; Path=/; SameSite=Lax';

export const setAuthCookies = (
  res: NextApiResponse,
  tokens: {
    sessionToken: string;
    refreshToken: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
  },
) => {
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(tokens.sessionToken)}; Expires=${tokens.expiresAt.toUTCString()}; ${cookieOptions}`,
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(tokens.refreshToken)}; Expires=${tokens.refreshExpiresAt.toUTCString()}; ${cookieOptions}`,
  ]);
};

export const clearAuthCookies = (res: NextApiResponse) => {
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE_NAME}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${cookieOptions}`,
    `${REFRESH_COOKIE_NAME}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${cookieOptions}`,
  ]);
};

export const getSessionToken = (req: NextApiRequest) =>
  parseCookies(req.headers.cookie)[SESSION_COOKIE_NAME];

export const getRefreshToken = (req: NextApiRequest) =>
  parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];

export const requireUser = (ctx: IContext): PublicUser => {
  if (!ctx.currentUser) {
    throw new Error('Authentication required');
  }
  return ctx.currentUser;
};

export const requireDev = (ctx: IContext): PublicUser => {
  const user = requireUser(ctx);
  if (user.role !== 'dev' && user.role !== 'admin') {
    throw new Error('Developer permission required');
  }
  return user;
};
