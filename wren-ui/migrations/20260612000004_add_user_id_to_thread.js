const DEFAULT_DEV_EMAIL = process.env.WREN_DEFAULT_DEV_EMAIL || 'admin@wren.ai';

/**
 * Add user_id to thread for per-user chat history.
 * Legacy threads are backfilled to the default dev user (the same account
 * that owns legacy projects) so existing chat history stays reachable.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('thread', (table) => {
    table
      .integer('user_id')
      .nullable()
      .references('id')
      .inTable('user')
      .comment('Reference to user.id; the user who owns the thread');
    table.index(
      ['project_id', 'user_id', 'created_at'],
      'thread_project_id_user_id_created_at_index',
    );
  });

  const defaultDev = await knex('user')
    .where({ email: DEFAULT_DEV_EMAIL })
    .first();
  if (defaultDev) {
    await knex('thread')
      .whereNull('user_id')
      .update({ user_id: defaultDev.id });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('thread', (table) => {
    table.dropForeign('user_id');
    table.dropIndex(
      ['project_id', 'user_id', 'created_at'],
      'thread_project_id_user_id_created_at_index',
    );
    table.dropColumn('user_id');
  });
};
