// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
if (process.env.DB_TYPE === 'pg') {
  console.log('Using Postgres');
  module.exports = {
    client: 'pg',
    connection: {
      connectionString: process.env.PG_URL,
      ssl:
        process.env.PG_SSL_REJECT_UNAUTHORIZED === 'false'
          ? { rejectUnauthorized: false }
          : undefined,
    },
    pool: {
      min: 0,
      max: 5,
      idleTimeoutMillis: 10000,
    },
  };
} else {
  console.log('Using SQLite');
  module.exports = {
    client: 'better-sqlite3',
    connection: process.env.SQLITE_FILE || './db.sqlite3',
    useNullAsDefault: true,
  };
}
