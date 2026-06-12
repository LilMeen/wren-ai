/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('user', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable().unique().comment('Unique login email');
    table.text('password_hash').notNullable().comment('Hashed password only');
    table
      .string('role')
      .notNullable()
      .defaultTo('user')
      .comment('Global role: dev, user, admin');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('user');
};
