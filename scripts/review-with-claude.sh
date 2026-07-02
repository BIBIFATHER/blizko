#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude || true)}"
CLAUDE_REVIEW_MIN_VERSION="2.1.170"

node "$ROOT_DIR/scripts/agent-workflow.mjs" review-preflight claude

if [[ -z "$CLAUDE_BIN" || ! -x "$CLAUDE_BIN" ]]; then
  echo "Claude binary not found or not executable." >&2
  exit 1
fi

CLAUDE_VERSION="$("$CLAUDE_BIN" --version | awk '{print $1}')"
if ! node -e '
  const current = process.argv[1].split(".").map(Number);
  const minimum = process.argv[2].split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((current[i] || 0) > (minimum[i] || 0)) process.exit(0);
    if ((current[i] || 0) < (minimum[i] || 0)) process.exit(1);
  }
' "$CLAUDE_VERSION" "$CLAUDE_REVIEW_MIN_VERSION"; then
  echo "Claude Code $CLAUDE_REVIEW_MIN_VERSION or newer is required; found $CLAUDE_VERSION." >&2
  exit 1
fi

if [[ $# -gt 0 ]]; then
  REVIEW_CONTEXT="$*"
else
  REVIEW_CONTEXT="$(cat)"
fi

if [[ -z "${REVIEW_CONTEXT// }" ]]; then
  echo "Provide the conclusion or task to review as an argument or stdin." >&2
  exit 1
fi

cd "$ROOT_DIR"

REVIEW_PROMPT="Read .context/AGENT_COORDINATION.md and all protocols relevant to this task.

Codex produced the following conclusion or implementation report:

${REVIEW_CONTEXT}

Independently challenge it using repository files. This reviewer session has
only Read, Grep, and Glob tools. Do not edit files, run commands, update
external systems, use real user data, or perform production actions.

This challenge review does not replace the normal-session blizko-lawyer or
blizko-security specialist gates.

Return:
1. Agreements supported by evidence.
2. Disagreements or missing risks, with severity and file:line evidence.
3. Required corrections.
4. Verdict: Confirmed / Confirmed with conditions / Rejected.

Do not restate the report without independently checking it."

printf '%s\n' "$REVIEW_PROMPT" | "$CLAUDE_BIN" -p \
  --safe-mode \
  --no-session-persistence \
  --permission-mode dontAsk \
  --tools "Read,Grep,Glob"
