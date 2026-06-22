/**
 * Relation `name` was globally unique (index `relation_name_unique` on `name`
 * only), which collides across projects that share table/column names since the
 * generated relation name does not include project_id. Scope uniqueness to the
 * project instead, matching the `model` / `model_column` tables.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('relation', (table) => {
    table.dropUnique(['name'], 'relation_name_unique');
    table.unique(['project_id', 'name'], {
      indexName: 'relation_project_id_name_unique',
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('relation', (table) => {
    table.dropUnique(['project_id', 'name'], 'relation_project_id_name_unique');
    table.unique(['name'], { indexName: 'relation_name_unique' });
  });
};
