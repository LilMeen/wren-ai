/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('ontology', (table) => {
    table.increments('id').primary();
    table
      .integer('project_id')
      .notNullable()
      .comment('Reference to project.id');
    table
      .json('definition')
      .nullable()
      .comment(
        'The ontology graph: { entities: [...], relationships: [...] }, stored as JSON',
      );
    table
      .string('status')
      .notNullable()
      .defaultTo('draft')
      .comment('draft | active');
    table
      .string('generated_by')
      .nullable()
      .comment('ai | user, who produced the current definition');

    table.foreign('project_id').references('project.id').onDelete('CASCADE');
    // one ontology row per project
    table.unique(['project_id']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('ontology');
};
