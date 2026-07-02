import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const runner = path.resolve(testDir, '../run-with-timeout.mjs');

const success = spawnSync(process.execPath, [runner, '2', process.execPath, '-e', 'process.exit(0)'], {
  encoding: 'utf8',
});
assert.equal(success.status, 0, success.stderr);

const startedAt = Date.now();
const timeout = spawnSync(
  process.execPath,
  [runner, '0.2', process.execPath, '-e', 'setInterval(() => {}, 1000)'],
  { encoding: 'utf8', timeout: 5_000 },
);
const elapsedMs = Date.now() - startedAt;

assert.equal(timeout.status, 124, timeout.stderr);
assert.match(timeout.stderr, /timed out after 0.2s/i);
assert.ok(elapsedMs < 3_000, `timeout took too long: ${elapsedMs}ms`);

console.log('run-with-timeout: 2 checks passed');

