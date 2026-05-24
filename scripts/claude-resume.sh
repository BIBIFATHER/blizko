#!/usr/bin/env bash
set -euo pipefail

today="$(TZ=Europe/Moscow date +%F)"
yesterday="$(TZ=Europe/Moscow date -v-1d +%F 2>/dev/null || date -j -f '%Y-%m-%d' "$today" -v-1d +%F)"

echo "BOOTSTRAP"
echo "=========="
cat BOOTSTRAP.md
echo
echo "MEMORY"
echo "======"
for file in SOUL.md USER.md MEMORY.md "memory/${today}.md" "memory/${yesterday}.md"; do
  if [[ -f "$file" ]]; then
    echo "--- ${file}"
    cat "$file"
    echo
  fi
done
echo "CLAUDE"
echo "======"
cat CLAUDE.md
