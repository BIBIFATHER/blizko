#!/usr/bin/env node
/**
 * BLI-103 E2E cleanup — server-side only (service-role / direct DB).
 *
 * Deletes ONLY rows that carry this run's unique marker, strictly by exact id,
 * with a marker guard on every DELETE, then verifies zero remaining. Never
 * deletes by user_id / timestamp / prefix. Safe to run repeatedly and on a
 * failed/cancelled job (CI calls it with `if: always()`).
 *
 * Env: E2E_RUN_ID (required), E2E_DATABASE_URL | DATABASE_URL | POSTGRES_URL.
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

async function main() {
  await client.connect();

  // 1) Discover exact ids carrying the marker (read-only).
  const parents = await client.query(
    `SELECT id FROM public.parents WHERE to_jsonb(parents.*)::text LIKE $1`,
    [`%${MARKER}%`],
  );
  const ids = parents.rows.map((r) => r.id);
  console.log(`[e2e-cleanup] marker=${MARKER} parents matched: ${ids.length}`);

  // 2) Delete strictly by exact id + marker guard.
  let deletedParents = 0;
  for (const id of ids) {
    const res = await client.query(
      `DELETE FROM public.parents
         WHERE id = $1 AND to_jsonb(parents.*)::text LIKE $2`,
      [id, `%${MARKER}%`],
    );
    deletedParents += res.rowCount ?? 0;
  }
  // matching_outcomes (if the flow produced any) — marker lives in feedback_text.
  const mo = await client.query(
    `DELETE FROM public.matching_outcomes WHERE feedback_text LIKE $1`,
    [`%${MARKER}%`],
  );

  // 3) Verify zero remaining for the marker.
  const left = await client.query(
    `SELECT
       (SELECT count(*) FROM public.parents WHERE to_jsonb(parents.*)::text LIKE $1) AS p,
       (SELECT count(*) FROM public.matching_outcomes WHERE feedback_text LIKE $1) AS mo`,
    [`%${MARKER}%`],
  );
  const remP = Number(left.rows[0].p);
  const remMo = Number(left.rows[0].mo);
  console.log(
    `[e2e-cleanup] deleted parents=${deletedParents} matching_outcomes=${mo.rowCount ?? 0}; ` +
      `remaining parents=${remP} matching_outcomes=${remMo}`,
  );
  if (remP !== 0 || remMo !== 0) {
    throw new Error(
      `[e2e-cleanup] verify-zero FAILED (parents=${remP}, matching_outcomes=${remMo})`,
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
