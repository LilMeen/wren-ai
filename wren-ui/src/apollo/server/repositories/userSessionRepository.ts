import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface UserSession {
  id: number;
  userId: number;
  sessionTokenHash: string;
  refreshTokenHash: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  revokedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserSessionRepository extends IBasicRepository<UserSession> {
  findValidBySessionTokenHash(hash: string): Promise<UserSession | null>;
  findValidByRefreshTokenHash(hash: string): Promise<UserSession | null>;
  revoke(id: number): Promise<UserSession>;
}

export class UserSessionRepository
  extends BaseRepository<UserSession>
  implements IUserSessionRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'user_session' });
  }

  public async findValidBySessionTokenHash(hash: string) {
    const [session] = await this.knex(this.tableName)
      .where({ session_token_hash: hash })
      .whereNull('revoked_at')
      .where('expires_at', '>', this.knex.fn.now())
      .limit(1);
    return session ? this.transformFromDBData(session) : null;
  }

  public async findValidByRefreshTokenHash(hash: string) {
    const [session] = await this.knex(this.tableName)
      .where({ refresh_token_hash: hash })
      .whereNull('revoked_at')
      .where('refresh_expires_at', '>', this.knex.fn.now())
      .limit(1);
    return session ? this.transformFromDBData(session) : null;
  }

  public async revoke(id: number) {
    return this.updateOne(id, { revokedAt: new Date() });
  }
}
