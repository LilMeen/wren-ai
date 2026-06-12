import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export enum UserRole {
  DEV = 'dev',
  USER = 'user',
  ADMIN = 'admin',
}

export interface User {
  id: number; // ID
  email: string; // Unique login email
  passwordHash: string; // Hashed password only
  role: UserRole; // Global role: dev, user, admin
}

export interface IUserRepository extends IBasicRepository<User> {
  findByEmail(email: string): Promise<User | null>;
}

export class UserRepository
  extends BaseRepository<User>
  implements IUserRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'user' });
  }

  public async findByEmail(email: string): Promise<User | null> {
    return await this.findOneBy({
      email: email.trim().toLowerCase(),
    } as Partial<User>);
  }
}
