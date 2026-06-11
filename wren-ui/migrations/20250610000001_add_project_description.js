exports.up = async function (knex) {
  const hasDescription = await knex.schema.hasColumn('project', 'description');
  if (!hasDescription) {
    await knex.schema.alterTable('project', (table) => {
      table.text('description').nullable();
    });
  }
};

exports.down = async function (knex) {
  const hasDescription = await knex.schema.hasColumn('project', 'description');
  if (hasDescription) {
    await knex.schema.alterTable('project', (table) => {
      table.dropColumn('description');
    });
  }
};
