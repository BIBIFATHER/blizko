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

const here = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_DIR = path.resolve(here, '..', '.auth');
export const PARENT_STATE = path.join(AUTH_DIR, 'parent.json');
export const ADMIN_STATE = path.join(AUTH_DIR, 'admin.json');

/** Unique per-run marker embedded in created test data; used for exact cleanup. */
export function runMarker(): string {
  const id = process.env.E2E_RUN_ID || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-bli103-${id}`;
}
