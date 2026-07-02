import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const script = resolve(root, 'scripts/agent-workflow.mjs');
const statePath = resolve(root, '.context/AGENT_STATE.json');
const branch = execFileSync('git', ['branch', '--show-current'], {
  cwd: root,
  encoding: 'utf8',
}).trim();

function run(args, state = JSON.parse(readFileSync(statePath, 'utf8')), env = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'agent-workflow-'));
  const path = join(directory, 'state.json');
  writeFileSync(path, JSON.stringify(state));
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, AGENT_STATE_PATH: path, AGENT_WORKFLOW_BRANCH: branch, ...env },
  });
}

function runCommitCheck(previousState, stagedFiles) {
  const directory = mkdtempSync(join(tmpdir(), 'agent-workflow-commit-'));
  const currentPath = join(directory, 'current.json');
  const previousPath = join(directory, 'previous.json');
  writeFileSync(currentPath, JSON.stringify(previousState));
  writeFileSync(previousPath, JSON.stringify(previousState));
  return spawnSync(process.execPath, [script, 'commit-check'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENT_STATE_PATH: currentPath,
      AGENT_PREVIOUS_STATE_PATH: previousPath,
      AGENT_WORKFLOW_BRANCH: branch,
      AGENT_WORKFLOW_STAGED_FILES: stagedFiles,
    },
  });
}

let checks = 0;

const current = run(['check']);
assert.equal(current.status, 0, current.stderr);
assert.match(current.stdout, /next=claude/);
checks += 1;

const wrongPhase = run(['review-preflight', 'codex']);
assert.equal(wrongPhase.status, 1);
assert.match(wrongPhase.stderr, /review requires review_requested/);
checks += 1;

const staleBranch = run(['check'], undefined, { AGENT_WORKFLOW_BRANCH: 'codex/stale-task' });
assert.equal(staleBranch.status, 1);
assert.match(staleBranch.stderr, /state branch/);
checks += 1;

const excessiveRoundState = JSON.parse(readFileSync(statePath, 'utf8'));
excessiveRoundState.review_round = excessiveRoundState.max_review_rounds + 1;
const excessiveRound = run(['check'], excessiveRoundState);
assert.equal(excessiveRound.status, 1);
assert.match(excessiveRound.stderr, /review round limit exceeded/);
checks += 1;

const staleArtifactState = JSON.parse(readFileSync(statePath, 'utf8'));
staleArtifactState.artifact_sha = '0000000000000000000000000000000000000000';
const staleArtifact = run(['check'], staleArtifactState);
assert.equal(staleArtifact.status, 1);
assert.match(staleArtifact.stderr, /is not an ancestor/);
checks += 1;

const reviewerState = JSON.parse(readFileSync(statePath, 'utf8'));
reviewerState.phase = 'review_requested';
reviewerState.next_actor = 'codex';
const reviewerProductCommit = runCommitCheck(reviewerState, 'api/bookings.ts');
assert.equal(reviewerProductCommit.status, 1);
assert.match(reviewerProductCommit.stderr, /reviewer is read-only/);
checks += 1;

const reviewerVerdictCommit = runCommitCheck(
  reviewerState,
  '.context/AGENT_STATE.json\n.context/reviews/verdict.md',
);
assert.equal(reviewerVerdictCommit.status, 0, reviewerVerdictCommit.stderr);
checks += 1;

console.log(`agent-workflow: ${checks} checks passed`);
