import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { getLogger } from '@server/utils/logger';
import {
  IUserRepository,
  User,
  UserRole,
} from '../repositories/userRepository';
import {
  IUserSessionRepository,
  UserSession,
} from '../repositories/userSessionRepository';

const logger = getLogger('AuthService');
logger.level = 'debug';

// session/access token lives 24 hours, refresh token 30 days
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// In-memory cache for validated sessions so every request doesn't block on a
// DB round-trip. Entries expire after 60 seconds or are evicted on sign-out.
const SESSION_CACHE_TTL_MS = 60 * 1000;
interface CacheEntry { user: User; expiresAt: number }
const sessionCache = new Map<string, CacheEntry>();
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface SignUpInput {
  email: string;
  password: string;
  role: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  sessionToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export interface AuthResult extends AuthTokens {
  user: User;
}

export interface IAuthService {
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(input: SignInInput): Promise<AuthResult>;
  signOut(sessionToken: string): Promise<void>;
  refreshSession(refreshToken: string): Promise<AuthResult>;
  validateSessionToken(sessionToken: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
}

export class AuthService implements IAuthService {
  private userRepository: IUserRepository;
  private userSessionRepository: IUserSessionRepository;

  constructor({
    userRepository,
    userSessionRepository,
  }: {
    userRepository: IUserRepository;
    userSessionRepository: IUserSessionRepository;
  }) {
    this.userRepository = userRepository;
    this.userSessionRepository = userSessionRepository;
  }

  public async signUp(input: SignUpInput): Promise<AuthResult> {
    const email = (input.email || '').trim().toLowerCase();
    const password = input.password || '';
    const role = (input.role || '').trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      throw new AuthError('Please provide a valid email address.');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new AuthError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      );
    }
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new AuthError('Role must be one of dev, user, or admin.');
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AuthError(
        'An account with this email already exists. Please sign in instead.',
        409,
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.userRepository.createOne({
      email,
      passwordHash,
      role: role as UserRole,
    });
    logger.info(`User signed up: ${user.email} (role: ${user.role})`);

    const tokens = await this.createSession(user.id);
    return { user, ...tokens };
  }

  public async signIn(input: SignInInput): Promise<AuthResult> {
    const email = (input.email || '').trim().toLowerCase();
    const password = input.password || '';

    const user = await this.userRepository.findByEmail(email);
    // run a dummy compare to keep timing consistent whether or not the user exists
    const passwordHash =
      user?.passwordHash || '$2a$10$invalidsaltinvalidsaltinvalidsaltinvalid';
    const isPasswordValid = await bcrypt.compare(password, passwordHash);
    if (!user || !isPasswordValid) {
      throw new AuthError('Invalid email or password.', 401);
    }

    const tokens = await this.createSession(user.id);
    logger.info(`User signed in: ${user.email}`);
    return { user, ...tokens };
  }

  public async signOut(sessionToken: string): Promise<void> {
    if (!sessionToken) return;
    const tokenHash = this.hashToken(sessionToken);
    sessionCache.delete(tokenHash);
    const session = await this.userSessionRepository.findBySessionTokenHash(tokenHash);
    if (session && !session.revokedAt) {
      await this.userSessionRepository.updateOne(session.id, {
        revokedAt: new Date(),
      });
    }
  }

  public async refreshSession(refreshToken: string): Promise<AuthResult> {
    if (!refreshToken) {
      throw new AuthError('Refresh token is required.', 401);
    }
    const session = await this.userSessionRepository.findByRefreshTokenHash(
      this.hashToken(refreshToken),
    );
    if (
      !session ||
      session.revokedAt ||
      !this.isInFuture(session.refreshExpiresAt)
    ) {
      throw new AuthError('Session expired. Please sign in again.', 401);
    }

    const user = await this.userRepository.findOneBy({ id: session.userId });
    if (!user) {
      throw new AuthError('Session expired. Please sign in again.', 401);
    }

    // rotate: revoke the old session and issue a new one
    await this.userSessionRepository.updateOne(session.id, {
      revokedAt: new Date(),
    });
    const tokens = await this.createSession(user.id);
    return { user, ...tokens };
  }

  public async validateSessionToken(sessionToken: string): Promise<User | null> {
    if (!sessionToken) return null;
    const tokenHash = this.hashToken(sessionToken);

    const cached = sessionCache.get(tokenHash);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }

    const session = await this.userSessionRepository.findBySessionTokenHash(tokenHash);
    if (!session || session.revokedAt || !this.isInFuture(session.expiresAt)) {
      sessionCache.delete(tokenHash);
      return null;
    }
    const user = await this.userRepository.findOneBy({ id: session.userId });
    if (user) {
      sessionCache.set(tokenHash, { user, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
    }
    return user;
  }

  public async getUserById(id: number): Promise<User | null> {
    return await this.userRepository.findOneBy({ id });
  }

  private async createSession(userId: number): Promise<AuthTokens> {
    const sessionToken = this.generateToken();
    const refreshToken = this.generateToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await this.userSessionRepository.createOne({
      userId,
      sessionTokenHash: this.hashToken(sessionToken),
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt,
      refreshExpiresAt,
    } as Partial<UserSession>);

    return { sessionToken, refreshToken, expiresAt, refreshExpiresAt };
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private isInFuture(value: string | Date): boolean {
    return new Date(value).getTime() > Date.now();
  }
}
