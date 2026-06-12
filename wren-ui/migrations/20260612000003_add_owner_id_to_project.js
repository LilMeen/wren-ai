const DEFAULT_DEV_EMAIL = process.env.WREN_DEFAULT_DEV_EMAIL || 'admin@wren.ai';
const DEFAULT_DEV_PASSWORD = process.env.WREN_DEFAULT_DEV_PASSWORD || 'admin1234';

/**
 * Add owner_id to project. If legacy projects exist, create a default dev
 * account and backfill ownership so existing data keeps working.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('project', (table) => {
    table
      .integer('owner_id')
      .nullable()
      .references('id')
      .inTable('user')
      .comment('Reference to user.id; the dev who owns the project');
    table.index('owner_id');
  });

  // backfill: if the database already has projects, assign them to a default dev user
  const [{ count }] = await knex('project').count('id as count');
  if (Number(count) > 0) {
    let defaultDev = await knex('user')
      .where({ email: DEFAULT_DEV_EMAIL })
      .first();
    if (!defaultDev) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const bcrypt = require('bcryptjs');
      const passwordHash = bcrypt.hashSync(DEFAULT_DEV_PASSWORD, 10);
      const inserted = await knex('user')
        .insert({
          email: DEFAULT_DEV_EMAIL,
          password_hash: passwordHash,
          role: 'dev',
        })
        .returning('*');
      defaultDev = inserted[0];
    }
    await knex('project')
      .whereNull('owner_id')
      .update({ owner_id: defaultDev.id });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('project', (table) => {
    table.dropForeign('owner_id');
    table.dropIndex('owner_id');
    table.dropColumn('owner_id');
  });
};
