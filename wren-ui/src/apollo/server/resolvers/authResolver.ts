import { NextApiResponse } from 'next';
import { IContext } from '../types';
import { UserRole } from '../repositories';
import {
  clearAuthCookies,
  getRefreshToken,
  getSessionToken,
  setAuthCookies,
} from '../utils/auth';

export class AuthResolver {
  constructor() {
    this.currentUser = this.currentUser.bind(this);
    this.signUp = this.signUp.bind(this);
    this.signIn = this.signIn.bind(this);
    this.refreshSession = this.refreshSession.bind(this);
    this.logout = this.logout.bind(this);
  }

  public async currentUser(_root: any, _args: any, ctx: IContext) {
    return ctx.currentUser || null;
  }

  public async signUp(
    _root: any,
    args: { data: { email: string; password: string; role: UserRole } },
    ctx: IContext,
  ) {
    const result = await ctx.authService.signUp(
      args.data.email,
      args.data.password,
      args.data.role,
    );
    setAuthCookies((ctx as any).res as NextApiResponse, result);
    return { user: result.user };
  }

  public async signIn(
    _root: any,
    args: { data: { email: string; password: string } },
    ctx: IContext,
  ) {
    const result = await ctx.authService.signIn(
      args.data.email,
      args.data.password,
    );
    setAuthCookies((ctx as any).res as NextApiResponse, result);
    return { user: result.user };
  }

  public async refreshSession(_root: any, _args: any, ctx: IContext) {
    const result = await ctx.authService.refresh(
      getRefreshToken((ctx as any).req),
    );
    setAuthCookies((ctx as any).res as NextApiResponse, result);
    return { user: result.user };
  }

  public async logout(_root: any, _args: any, ctx: IContext) {
    await ctx.authService.logout(getSessionToken((ctx as any).req));
    clearAuthCookies((ctx as any).res as NextApiResponse);
    return true;
  }
}
