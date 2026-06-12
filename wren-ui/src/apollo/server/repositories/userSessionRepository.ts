import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface UserSession {
  id: number; // ID
  userId: number; // Reference to user.id
  sessionTokenHash: string; // Hash of the session/access token
  refreshTokenHash: string; // Hash of the refresh token
  expiresAt: string | Date; // Session/access token expiry
  refreshExpiresAt: string | Date; // Refresh token expiry
  revokedAt?: string | Date | null; // Set on logout/revoke
}

export interface IUserSessionRepository extends IBasicRepository<UserSession> {
  findBySessionTokenHash(tokenHash: string): Promise<UserSession | null>;
  findByRefreshTokenHash(tokenHash: string): Promise<UserSession | null>;
}

export class UserSessionRepository
  extends BaseRepository<UserSession>
  implements IUserSessionRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'user_session' });
  }

  public async findBySessionTokenHash(
    tokenHash: string,
  ): Promise<UserSession | null> {
    return await this.findOneBy({ sessionTokenHash: tokenHash });
  }

  public async findByRefreshTokenHash(
    tokenHash: string,
  ): Promise<UserSession | null> {
    return await this.findOneBy({ refreshTokenHash: tokenHash });
  }
}
