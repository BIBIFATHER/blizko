import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Runs the server-side cleanup after the smoke. CI also runs the same script as
 * an `if: always()` step so a failed/cancelled job still cleans up.
 */
export default async function globalTeardown(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const script = path.resolve(here, '..', 'scripts', 'e2e-cleanup.mjs');
  const res = spawnSync('node', [script], { stdio: 'inherit', env: process.env });
  if (res.status !== 0) {
    throw new Error(`[e2e] global teardown cleanup failed (exit ${res.status})`);
  }
}
