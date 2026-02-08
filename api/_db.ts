import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL');
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
