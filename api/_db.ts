import { Pool } from 'pg';

let pool: Pool | null = null;

function buildConnectionString() {
  const direct =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (direct) return direct;

  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DATABASE;

  if (!host || !user || !password || !database) {
    return null;
  }

  const url = new URL(`postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${database}`);
  url.searchParams.set('sslmode', 'require');
  return url.toString();
}

export function getDbPool() {
  if (pool) return pool;

  const connectionString = buildConnectionString();
  if (!connectionString) {
    throw new Error('Missing database connection settings');
  }

  pool = new Pool({
    connectionString,
    ssl:
      process.env.PGSSLMODE === 'disable'
        ? false
        : {
            rejectUnauthorized: false,
          },
  });

  return pool;
}
