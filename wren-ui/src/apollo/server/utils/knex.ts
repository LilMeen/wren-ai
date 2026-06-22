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
        // keep TCP connections alive so proxy/firewall idle-timeouts don't
        // silently drop them while the pool thinks they are still usable
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      },
      debug,
      pool: {
        min: 0,
        max: 5,
        // give the pool enough time to acquire / create a connection
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        // retire idle connections after 30 s — long enough to survive brief
        // lulls but short enough to avoid hitting the server's idle timeout
        idleTimeoutMillis: 30000,
        // don't let a single failed create kill every waiting query
        propagateCreateError: false,
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
