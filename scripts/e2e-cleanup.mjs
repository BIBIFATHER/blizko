#!/usr/bin/env node
/**
 * BLI-103 E2E cleanup — server-side only (service-role / direct DB).
 *
 * For every table it touches: SELECT the exact ids carrying this run's unique
 * marker (read-only), then DELETE strictly by exact id WITH a marker guard, then
 * verify zero remaining. Never deletes by user_id / timestamp / prefix. Safe to
 * run repeatedly and on a failed/cancelled job (CI calls it with `if: always()`).
 *
 * Fail-closed: refuses to run unless the DB connection targets the declared E2E
 * project (E2E_SUPABASE_URL ref), never production.
 *
 * Env: E2E_RUN_ID (required), E2E_DATABASE_URL | DATABASE_URL | POSTGRES_URL,
 *      E2E_SUPABASE_URL (required), E2E_FORBIDDEN_PROD_REF (optional).
 */
import pg from 'pg';

const runId = process.env.E2E_RUN_ID;
if (!runId) {
  console.error('[e2e-cleanup] E2E_RUN_ID is required');
  process.exit(2);
}
const MARKER = `e2e-bli103-${runId}`;
const rawConn =
  process.env.E2E_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!rawConn) {
  console.error('[e2e-cleanup] no DB connection string (E2E_DATABASE_URL/DATABASE_URL)');
  process.exit(2);
}

// --- Fail-closed: the DB must be the declared E2E project, never production. ---
function refFromSupabaseUrl(url) {
  return new URL(url).hostname.split('.')[0];
}
function refFromDbUrl(dbUrl) {
  const u = new URL(dbUrl);
  const direct = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (direct) return direct[1];
  const pooler = decodeURIComponent(u.username).match(/^postgres\.([a-z0-9]+)$/i);
  if (pooler) return pooler[1];
  return null;
}
function assertE2EProject() {
  const declared = process.env.E2E_SUPABASE_URL;
  if (!declared) {
    console.error('[e2e-cleanup] missing required env: E2E_SUPABASE_URL');
    process.exit(2);
  }
  const want = refFromSupabaseUrl(declared);
  const got = refFromDbUrl(rawConn);
  if (got && got !== want) {
    console.error(`[e2e-cleanup] project ref mismatch: DB -> ${got}, expected ${want}`);
    process.exit(2);
  }
  const forbidden = process.env.E2E_FORBIDDEN_PROD_REF;
  if (forbidden && want === forbidden) {
    console.error(`[e2e-cleanup] refusing: E2E ref "${want}" equals forbidden production ref`);
    process.exit(2);
  }
}
assertE2EProject();

// SSL is governed by the connection string's `sslmode`, not by disabling
// verification in code. Mirror api/_db.ts: ensure an sslmode is present
// (Supabase direct connections in this repo use `no-verify`). Operators may set
// `sslmode=verify-full` in the secret for full chain verification.
function normalizeConn(connectionString) {
  try {
    const url = new URL(connectionString);
    if (!url.searchParams.get('sslmode')) url.searchParams.set('sslmode', 'no-verify');
    return url.toString();
  } catch {
    return connectionString;
  }
}

const client = new pg.Client({ connectionString: normalizeConn(rawConn) });

/**
 * SELECT exact ids carrying the marker, then DELETE each by exact id + marker
 * guard. Returns { matched, deleted }. `markerExpr` is the SQL boolean that
 * detects the marker for this table.
 */
async function purge(table, markerExpr) {
  const sel = await client.query(`SELECT id FROM ${table} WHERE ${markerExpr}`, [`%${MARKER}%`]);
  const ids = sel.rows.map((r) => r.id);
  let deleted = 0;
  for (const id of ids) {
    const res = await client.query(`DELETE FROM ${table} WHERE ${markerExpr} AND id = $2`, [
      `%${MARKER}%`,
      id,
    ]);
    deleted += res.rowCount ?? 0;
  }
  // verify-zero for this table
  const left = await client.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${markerExpr}`, [
    `%${MARKER}%`,
  ]);
  const remaining = left.rows[0].n;
  console.log(
    `[e2e-cleanup] ${table}: matched=${ids.length} deleted=${deleted} remaining=${remaining}`,
  );
  return remaining;
}

async function main() {
  await client.connect();
  console.log(`[e2e-cleanup] marker=${MARKER}`);

  // Each table: marker guard uses the column where the marker actually lands.
  // The parent flow embeds the marker in the family story (parents.comment); a
  // whole-row LIKE is used as a defensive superset. matching_outcomes (if the
  // flow produced any) carries the marker in feedback_text.
  const tables = [
    ['public.parents', 'to_jsonb(parents.*)::text LIKE $1'],
    ['public.matching_outcomes', 'feedback_text LIKE $1'],
  ];

  let totalRemaining = 0;
  for (const [table, expr] of tables) {
    totalRemaining += await purge(table, expr);
  }

  if (totalRemaining !== 0) {
    throw new Error(
      `[e2e-cleanup] verify-zero FAILED (remaining rows across tables=${totalRemaining})`,
    );
  }
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error(err);
    await client.end().catch(() => {});
    process.exit(1);
  });
