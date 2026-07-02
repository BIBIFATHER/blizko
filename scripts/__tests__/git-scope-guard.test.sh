#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GUARD="$ROOT_DIR/scripts/git-scope-guard.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass=0
fail=0

expect_pass() {
  local name="$1" branch="$2" files="$3" message="$4"
  local message_file="$TMP_DIR/message"
  printf '%s\n' "$message" >"$message_file"
  if GIT_SCOPE_BRANCH="$branch" GIT_SCOPE_STAGED_FILES="$files" "$GUARD" "$message_file" >/dev/null 2>&1; then
    pass=$((pass + 1))
  else
    printf 'FAIL (expected pass): %s\n' "$name" >&2
    fail=$((fail + 1))
  fi
}

expect_reject() {
  local name="$1" branch="$2" files="$3" message="$4"
  local message_file="$TMP_DIR/message"
  printf '%s\n' "$message" >"$message_file"
  if GIT_SCOPE_BRANCH="$branch" GIT_SCOPE_STAGED_FILES="$files" "$GUARD" "$message_file" >/dev/null 2>&1; then
    printf 'FAIL (expected reject): %s\n' "$name" >&2
    fail=$((fail + 1))
  else
    pass=$((pass + 1))
  fi
}

expect_reject \
  'Plan C path on Plan B branch' \
  'codex/bli-141-plan-b' \
  'docs/superpowers/plans/2026-07-02-bli141-c-status-lifecycle-readers.md' \
  'docs: revise lifecycle plan'

expect_reject \
  'Plan C message on Plan B branch' \
  'codex/bli-141-plan-b' \
  'api/auth/delete-account.ts' \
  'feat(bli141): Plan C account lifecycle'

expect_reject \
  'BLI-139 message on Plan B branch' \
  'codex/bli-141-plan-b' \
  'api/auth/delete-account.ts' \
  'feat(bli139): add deletion reconciler'

expect_pass \
  'Plan B work on Plan B branch' \
  'codex/bli-141-plan-b' \
  'api/bookings.ts' \
  'fix(bli141): tighten create validation'

expect_pass \
  'Plan C work on Plan C branch' \
  'codex/bli-141-plan-c' \
  'docs/superpowers/plans/2026-07-02-bli141-c-status-lifecycle-readers.md' \
  'docs(bli141): Plan C rev4'

expect_pass \
  'Unrelated branch is unaffected' \
  'codex/git-scope-guard' \
  'docs/superpowers/plans/2026-07-02-bli141-c-status-lifecycle-readers.md' \
  'test: exercise guard'

if [[ "$fail" -ne 0 ]]; then
  printf '%d checks passed, %d failed\n' "$pass" "$fail" >&2
  exit 1
fi

printf 'git-scope-guard: %d checks passed\n' "$pass"

