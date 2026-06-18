/**
 * Adds a nullable `om_config` JSON column to the project table. It stores the
 * per-project OpenMetadata selection, shaped as
 * `{ serviceName: string | null, enabled: boolean }`. Infra-level OM url/token
 * live in env, not here.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('project', (table) => {
    table
      .json('om_config')
      .nullable()
      .comment(
        'Per-project OpenMetadata config: { serviceName, enabled }, stored as JSON',
      );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table('project', (table) => {
    table.dropColumn('om_config');
  });
};
