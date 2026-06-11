/**
 * Fail-closed gate for the BLI-103 smoke harness.
 *
 * Test-auth (the fixed test phone + a server-side admin session) must ONLY ever
 * run in CI/preview. This module refuses to proceed unless `E2E_TEST_AUTH=1` is
 * set AND the target base URL is a non-production host. Imported by both the
 * Playwright global-setup and the cleanup script.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function baseURL(): string {
  const url = process.env.PLAYWRIGHT_BASE_URL;
  if (!url) throw new Error('[e2e] PLAYWRIGHT_BASE_URL is required');
  return url.replace(/\/+$/, '');
}

// Fail-closed ALLOWLIST: only these host shapes are ever acceptable for
// test-auth. Anything else (production custom domains, prod *.vercel.app
// aliases, IP literals, IDN/punycode, hosts-file aliases, unknown TLDs) is
// refused by default. A denylist of prod hosts would be bypassable; this is not.
function isAllowedNonProdHost(rawHost: string): boolean {
  const host = rawHost.replace(/\.$/, '').toLowerCase(); // strip trailing dot, normalize
  if (host === 'localhost' || host === '127.0.0.1') return true;
  // Vercel *preview* deployment URLs only — must carry a deployment hash segment
  // (e.g. blizko-3-<hash>-<team>.vercel.app), which production aliases lack.
  if (/^[a-z0-9-]+-[a-z0-9]{6,}-[a-z0-9-]+\.vercel\.app$/.test(host)) return true;
  return false;
}

/** Throws unless the test-auth flag is set AND the target is an allow-listed non-production host. */
export function assertTestAuthAllowed(): void {
  if (process.env.E2E_TEST_AUTH !== '1') {
    throw new Error('[e2e] refusing to run: E2E_TEST_AUTH=1 is required (CI/preview only)');
  }
  let host = '';
  try {
    host = new URL(baseURL()).hostname;
  } catch {
    throw new Error(`[e2e] invalid PLAYWRIGHT_BASE_URL: ${process.env.PLAYWRIGHT_BASE_URL}`);
  }
  if (!isAllowedNonProdHost(host)) {
    throw new Error(
      `[e2e] refusing to run test-auth: host "${host}" is not an allow-listed non-production host ` +
        `(localhost, 127.0.0.1, or a Vercel preview *.vercel.app deployment)`,
    );
  }
}

/** Project ref from a Supabase URL: `<ref>.supabase.co`. */
export function projectRef(supabaseUrl: string): string {
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  if (!ref) throw new Error(`[e2e] cannot derive Supabase project ref from ${supabaseUrl}`);
  return ref;
}

/** Ref claim embedded in a Supabase anon/service JWT payload, if present. */
function refFromJwt(jwt: string): string | null {
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload.ref === 'string' ? payload.ref : null;
  } catch {
    return null;
  }
}

/** Ref from a Postgres connection string: direct `db.<ref>.supabase.co` or Supavisor user `postgres.<ref>`. */
function refFromDbUrl(dbUrl: string): string | null {
  try {
    const u = new URL(dbUrl);
    const direct = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (direct) return direct[1];
    const pooler = decodeURIComponent(u.username).match(/^postgres\.([a-z0-9]+)$/i);
    if (pooler) return pooler[1];
    return null;
  } catch {
    return null;
  }
}

/**
 * Refuse to run unless every E2E credential targets the SAME, explicitly
 * declared E2E Supabase project — never production. The expected ref comes from
 * E2E_SUPABASE_URL; SUPABASE_URL, the anon JWT, and the E2E database URL must
 * all match it. An optional E2E_FORBIDDEN_PROD_REF hard-blocks the prod ref.
 */
export function assertE2EProject(): void {
  const declared = process.env.E2E_SUPABASE_URL;
  if (!declared) throw new Error('[e2e] missing required secret: E2E_SUPABASE_URL');
  const want = projectRef(declared);

  const checks: Array<[string, string | null]> = [
    ['SUPABASE_URL', process.env.SUPABASE_URL ? projectRef(process.env.SUPABASE_URL) : null],
    [
      'E2E_SUPABASE_ANON_KEY',
      process.env.E2E_SUPABASE_ANON_KEY ? refFromJwt(process.env.E2E_SUPABASE_ANON_KEY) : null,
    ],
    [
      'E2E_DATABASE_URL',
      process.env.E2E_DATABASE_URL ? refFromDbUrl(process.env.E2E_DATABASE_URL) : null,
    ],
  ];
  for (const [name, got] of checks) {
    if (got && got !== want) {
      throw new Error(
        `[e2e] project ref mismatch: ${name} -> ${got}, expected ${want} (from E2E_SUPABASE_URL). ` +
          `Preview/API/cleanup must all use the dedicated E2E project, never production.`,
      );
    }
  }
  const forbidden = process.env.E2E_FORBIDDEN_PROD_REF;
  if (forbidden && want === forbidden) {
    throw new Error(
      `[e2e] refusing: E2E project ref "${want}" equals the forbidden production ref`,
    );
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_DIR = path.resolve(here, '..', '.auth');
export const PARENT_STATE = path.join(AUTH_DIR, 'parent.json');
export const ADMIN_STATE = path.join(AUTH_DIR, 'admin.json');

/** Unique per-run marker embedded in created test data; used for exact cleanup. */
export function runMarker(): string {
  const id = process.env.E2E_RUN_ID || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-bli103-${id}`;
}
