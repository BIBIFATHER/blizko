#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_BIN="${CODEX_BIN:-/Applications/Codex.app/Contents/Resources/codex}"

if [[ ! -x "$CODEX_BIN" ]]; then
  echo "Codex binary not found or not executable: $CODEX_BIN" >&2
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

"$CODEX_BIN" exec \
  --cd "$ROOT_DIR" \
  --sandbox read-only \
  --ephemeral \
  --ignore-user-config \
  "Read .context/AGENT_COORDINATION.md and all protocols relevant to this task.

Claude is the lead agent. Independently challenge the following conclusion or
implementation report:

${REVIEW_CONTEXT}

Inspect repository evidence. Do not edit files, update external systems, use
real user data, or perform production actions.

Return:
1. Agreements supported by evidence.
2. Disagreements or missing risks, with severity and file:line evidence.
3. Required corrections.
4. Verdict: Confirmed / Confirmed with conditions / Rejected.

Do not restate the lead report without independently checking it."
