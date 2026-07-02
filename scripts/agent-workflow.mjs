#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const statePath = process.env.AGENT_STATE_PATH || resolve(root, '.context/AGENT_STATE.json');

function fail(message) {
  process.stderr.write(`AGENT WORKFLOW ERROR: ${message}\n`);
  process.exit(1);
}

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function loadState() {
  let state;
  try {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
  } catch (error) {
    fail(`cannot read ${statePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const required = [
    'task_id',
    'work_item',
    'branch',
    'phase',
    'maker',
    'reviewer',
    'next_actor',
    'artifact_sha',
    'review_round',
    'max_review_rounds',
  ];
  for (const key of required)
    if (state[key] === undefined || state[key] === '') fail(`missing ${key}`);
  if (
    !['maker_active', 'review_requested', 'changes_requested', 'owner_gate'].includes(state.phase)
  ) {
    fail(`invalid phase ${state.phase}`);
  }
  if (state.review_round > state.max_review_rounds) fail('review round limit exceeded');
  return state;
}

function validateBase(state) {
  const branch = process.env.AGENT_WORKFLOW_BRANCH || git(['branch', '--show-current']);
  if (branch !== state.branch) fail(`state branch ${state.branch} != current branch ${branch}`);
  try {
    git(['merge-base', '--is-ancestor', state.artifact_sha, 'HEAD']);
  } catch {
    fail(`artifact ${state.artifact_sha} is not an ancestor of HEAD`);
  }
  const activeTask = readFileSync(resolve(root, '.context/ACTIVE_TASK.md'), 'utf8');
  if (!activeTask.toUpperCase().includes(state.work_item.toUpperCase())) {
    fail(`ACTIVE_TASK does not identify ${state.work_item}`);
  }
}

function reviewPreflight(state, reviewer) {
  validateBase(state);
  if (state.phase !== 'review_requested')
    fail(`review requires review_requested, got ${state.phase}`);
  if (state.next_actor !== reviewer || state.reviewer !== reviewer) {
    fail(`review belongs to ${state.reviewer}; next actor is ${state.next_actor}`);
  }
  if (git(['status', '--porcelain'])) fail('working tree must be clean before review');
  const changed = git(['diff', '--name-only', `${state.artifact_sha}..HEAD`])
    .split('\n')
    .filter(Boolean);
  const allowed = changed.every(
    (file) =>
      file === '.context/ACTIVE_TASK.md' ||
      file === '.context/AGENT_STATE.json' ||
      file.startsWith('.context/reviews/'),
  );
  if (!allowed) fail(`non-handoff changes exist after artifact ${state.artifact_sha}`);
}

function commitCheck(state) {
  validateBase(state);
  const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    .split('\n')
    .filter(Boolean);
  if (state.next_actor !== state.reviewer || staged.length === 0) return;
  const invalid = staged.filter(
    (file) =>
      file !== '.context/ACTIVE_TASK.md' &&
      file !== '.context/AGENT_STATE.json' &&
      !file.startsWith('.context/reviews/'),
  );
  if (invalid.length) fail(`reviewer is read-only; forbidden staged files: ${invalid.join(', ')}`);
}

const state = loadState();
const command = process.argv[2] || 'check';
if (command === 'check') {
  validateBase(state);
} else if (command === 'review-preflight') {
  reviewPreflight(state, process.argv[3] || '');
} else if (command === 'commit-check') {
  commitCheck(state);
} else {
  fail(`unknown command ${command}`);
}

process.stdout.write(
  `${state.task_id} ${state.work_item}: ${state.phase}; next=${state.next_actor}; artifact=${state.artifact_sha}; round=${state.review_round}/${state.max_review_rounds}\n`,
);
