import { Pool } from 'pg';

let pool: Pool | null = null;

function buildPoolConfig() {
  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DATABASE;
  const port = Number(process.env.POSTGRES_PORT || 5432);

  if (host && user && password && database) {
    return { host, user, password, database, port };
  }

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) return null;
  return { connectionString };
}

export function getDbPool() {
  if (pool) return pool;

  const poolConfig = buildPoolConfig();
  if (!poolConfig) {
    throw new Error('Missing database connection settings');
  }

  pool = new Pool({
    ...poolConfig,
    ssl:
      process.env.PGSSLMODE === 'disable'
        ? false
        : {
            rejectUnauthorized: false,
          },
  });

  return pool;
}
