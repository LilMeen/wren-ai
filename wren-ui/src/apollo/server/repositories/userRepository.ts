import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export type UserRole = 'dev' | 'user' | 'admin';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserRepository extends IBasicRepository<User> {}

export class UserRepository
  extends BaseRepository<User>
  implements IUserRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'user' });
  }
}
