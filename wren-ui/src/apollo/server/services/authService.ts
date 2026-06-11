import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  IUserRepository,
  IUserSessionRepository,
  User,
  UserRole,
} from '../repositories';

const SESSION_TOKEN_BYTES = 32;
const SESSION_EXPIRES_MS = 1000 * 60 * 60;
const REFRESH_EXPIRES_MS = 1000 * 60 * 60 * 24 * 30;
export const SESSION_COOKIE_NAME = 'wren_session';
export const REFRESH_COOKIE_NAME = 'wren_refresh';

export interface PublicUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface AuthResult {
  user: PublicUser;
  sessionToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export interface IAuthService {
  signUp(email: string, password: string, role: UserRole): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  authenticate(sessionToken?: string): Promise<PublicUser | null>;
  refresh(refreshToken?: string): Promise<AuthResult>;
  logout(sessionToken?: string): Promise<void>;
}

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

export const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const createToken = () =>
  crypto.randomBytes(SESSION_TOKEN_BYTES).toString('base64url');

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userSessionRepository: IUserSessionRepository,
  ) {}

  public async signUp(email: string, password: string, role: UserRole) {
    const normalizedEmail = this.normalizeEmail(email);
    this.validatePassword(password);
    this.validateRole(role);

    const existing = await this.userRepository.findOneBy({
      email: normalizedEmail,
    });
    if (existing) {
      throw new Error('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.userRepository.createOne({
      email: normalizedEmail,
      passwordHash,
      role,
    });
    return this.createSession(user);
  }

  public async signIn(email: string, password: string) {
    const user = await this.userRepository.findOneBy({
      email: this.normalizeEmail(email),
    });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    return this.createSession(user);
  }

  public async authenticate(sessionToken?: string) {
    if (!sessionToken) {
      return null;
    }
    const session =
      await this.userSessionRepository.findValidBySessionTokenHash(
        hashToken(sessionToken),
      );
    if (!session) {
      return null;
    }
    const user = await this.userRepository.findOneBy({ id: session.userId });
    return user ? toPublicUser(user) : null;
  }

  public async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }
    const session =
      await this.userSessionRepository.findValidByRefreshTokenHash(
        hashToken(refreshToken),
      );
    if (!session) {
      throw new Error('Invalid refresh token');
    }
    await this.userSessionRepository.revoke(session.id);
    const user = await this.userRepository.findOneBy({ id: session.userId });
    if (!user) {
      throw new Error('User not found');
    }
    return this.createSession(user);
  }

  public async logout(sessionToken?: string) {
    if (!sessionToken) {
      return;
    }
    const session = await this.userSessionRepository.findOneBy({
      sessionTokenHash: hashToken(sessionToken),
    });
    if (session && !session.revokedAt) {
      await this.userSessionRepository.revoke(session.id);
    }
  }

  private async createSession(user: User): Promise<AuthResult> {
    const sessionToken = createToken();
    const refreshToken = createToken();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRES_MS);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);

    await this.userSessionRepository.createOne({
      userId: user.id,
      sessionTokenHash: hashToken(sessionToken),
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      refreshExpiresAt,
    });

    return {
      user: toPublicUser(user),
      sessionToken,
      refreshToken,
      expiresAt,
      refreshExpiresAt,
    };
  }

  private normalizeEmail(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('A valid email is required');
    }
    return normalizedEmail;
  }

  private validatePassword(password: string) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
  }

  private validateRole(role: UserRole) {
    if (!['dev', 'user', 'admin'].includes(role)) {
      throw new Error('Invalid role');
    }
  }
}
