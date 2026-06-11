const bcrypt = require('bcryptjs');

const DEFAULT_DEV_EMAIL = process.env.DEFAULT_DEV_EMAIL || 'dev@wren.local';
const DEFAULT_DEV_PASSWORD = process.env.DEFAULT_DEV_PASSWORD || 'dev_password';

exports.up = async function (knex) {
  const hasUser = await knex.schema.hasTable('user');
  if (!hasUser) {
    await knex.schema.createTable('user', (table) => {
      table.increments('id').primary();
      table.string('email').notNullable().unique();
      table.text('password_hash').notNullable();
      table.string('role').notNullable();
      table.timestamps(true, true);
      table.check("role in ('dev', 'user', 'admin')");
    });
  }

  const hasUserSession = await knex.schema.hasTable('user_session');
  if (!hasUserSession) {
    await knex.schema.createTable('user_session', (table) => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().references('id').inTable('user').onDelete('CASCADE');
      table.text('session_token_hash').notNullable().unique();
      table.text('refresh_token_hash').notNullable().unique();
      table.timestamp('expires_at', { useTz: true }).notNullable();
      table.timestamp('refresh_expires_at', { useTz: true }).notNullable();
      table.timestamp('revoked_at', { useTz: true }).nullable();
      table.timestamps(true, true);
      table.index(['user_id']);
    });
  }

  const hasOwnerId = await knex.schema.hasColumn('project', 'owner_id');
  if (!hasOwnerId) {
    await knex.schema.alterTable('project', (table) => {
      table.integer('owner_id').nullable().references('id').inTable('user').onDelete('SET NULL');
      table.index(['owner_id']);
    });
  }

  const hasThreadUserId = await knex.schema.hasColumn('thread', 'user_id');
  if (!hasThreadUserId) {
    await knex.schema.alterTable('thread', (table) => {
      table.integer('user_id').nullable().references('id').inTable('user').onDelete('SET NULL');
      table.index(['user_id']);
      table.index(['project_id', 'user_id', 'created_at']);
    });
  }

  const hasProjects = Boolean(await knex('project').first('id'));
  const hasThreads = Boolean(await knex('thread').first('id'));
  if (hasProjects || hasThreads) {
    let defaultDev = await knex('user').where({ email: DEFAULT_DEV_EMAIL }).first();
    if (!defaultDev) {
      const passwordHash = await bcrypt.hash(DEFAULT_DEV_PASSWORD, 12);
      const [created] = await knex('user')
        .insert({ email: DEFAULT_DEV_EMAIL, password_hash: passwordHash, role: 'dev' })
        .returning('*');
      defaultDev = created;
    }
    await knex('project').whereNull('owner_id').update({ owner_id: defaultDev.id });
    await knex('thread').whereNull('user_id').update({ user_id: defaultDev.id });
  }
};

exports.down = async function (knex) {
  if (await knex.schema.hasColumn('thread', 'user_id')) {
    await knex.schema.alterTable('thread', (table) => {
      table.dropIndex(['project_id', 'user_id', 'created_at']);
      table.dropIndex(['user_id']);
      table.dropColumn('user_id');
    });
  }
  if (await knex.schema.hasColumn('project', 'owner_id')) {
    await knex.schema.alterTable('project', (table) => {
      table.dropIndex(['owner_id']);
      table.dropColumn('owner_id');
    });
  }
  await knex.schema.dropTableIfExists('user_session');
  await knex.schema.dropTableIfExists('user');
};
