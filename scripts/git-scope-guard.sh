#!/usr/bin/env bash
set -euo pipefail

# Prevent Plan C work from being committed on the Plan B branch. Environment
# overrides make the guard deterministic in tests without changing Git state.
branch="${GIT_SCOPE_BRANCH:-$(git branch --show-current)}"

case "$branch" in
  *bli-141-plan-b*) ;;
  *) exit 0 ;;
esac

commit_message_file="${1:-}"
commit_message=""
if [[ -n "$commit_message_file" && -f "$commit_message_file" ]]; then
  commit_message="$(cat "$commit_message_file")"
fi

if [[ -n "${GIT_SCOPE_STAGED_FILES+x}" ]]; then
  staged_files="$GIT_SCOPE_STAGED_FILES"
else
  staged_files="$(git diff --cached --name-only --diff-filter=ACMR)"
fi

reason=""
if printf '%s\n' "$staged_files" | grep -Eqi '(^|/)docs/superpowers/plans/[^/]*bli141-c-'; then
  reason="staged files contain a Plan C plan"
elif printf '%s\n' "$commit_message" | grep -Eqi '(^|[^[:alnum:]])(plan[[:space:]_-]*c|bli[-[:space:]]*139)([^[:alnum:]]|$)'; then
  reason="commit message identifies Plan C/BLI-139 work"
fi

if [[ -n "$reason" ]]; then
  cat >&2 <<EOF
ERROR: Git scope guard rejected this commit: $reason.

Current branch: $branch
Plan C belongs on: codex/bli-141-plan-c

Commit or checkpoint existing Plan B work first, then switch to the Plan C
branch. Bypass is intentionally unsupported; fix the branch boundary instead.
EOF
  exit 1
fi

