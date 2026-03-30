#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/AGENT_PROFILES/agents"
DST="$ROOT/agents"

mkdir -p "$DST"

for file in "$SRC"/*.md; do
  [ -e "$file" ] || continue
  base="$(basename "$file" .md)"
  cp "$file" "$DST/$base.prompt.md"
done

echo "Synced agent profiles:"
ls -1 "$DST"/*.prompt.md
