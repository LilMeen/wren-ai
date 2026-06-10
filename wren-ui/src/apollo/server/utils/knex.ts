interface KnexOptions {
  dbType: string;
  pgUrl?: string;
  debug?: boolean;
  sqliteFile?: string;
}

export const bootstrapKnex = (options: KnexOptions) => {
  if (options.dbType === 'pg') {
    const { pgUrl, debug } = options;
    console.log('using pg');
    /* eslint-disable @typescript-eslint/no-var-requires */
    return require('knex')({
      client: 'pg',
      connection: {
        connectionString: pgUrl,
        ssl:
          process.env.PG_SSL_REJECT_UNAUTHORIZED === 'false'
            ? { rejectUnauthorized: false }
            : undefined,
      },
      debug,
      pool: {
        min: 0,
        max: 5,
        idleTimeoutMillis: 10000,
      },
    });
  } else {
    console.log('using sqlite');
    /* eslint-disable @typescript-eslint/no-var-requires */
    return require('knex')({
      client: 'better-sqlite3',
      connection: {
        filename: options.sqliteFile,
      },
      useNullAsDefault: true,
    });
  }
};
