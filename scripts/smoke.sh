#!/usr/bin/env bash
set -euo pipefail

echo "== repo =="
git rev-parse --is-inside-work-tree >/dev/null
git status --short || true

echo "== node/npm =="
node -v
npm -v

echo "== install =="
npm ci

echo "== build =="
npm run -s build || true

echo "== tests =="
npm run -s test || true

echo "OK: smoke finished"
