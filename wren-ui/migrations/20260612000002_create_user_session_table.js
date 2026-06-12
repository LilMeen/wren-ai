/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_session', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('user')
      .onDelete('CASCADE')
      .comment('Reference to user.id');
    table
      .text('session_token_hash')
      .notNullable()
      .unique()
      .comment('Hash of the session/access token');
    table
      .text('refresh_token_hash')
      .notNullable()
      .unique()
      .comment('Hash of the refresh token');
    table
      .timestamp('expires_at')
      .notNullable()
      .comment('Session/access token expiry');
    table
      .timestamp('refresh_expires_at')
      .notNullable()
      .comment('Refresh token expiry');
    table.timestamp('revoked_at').nullable().comment('Set on logout/revoke');
    table.timestamps(true, true);

    table.index('user_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('user_session');
};
