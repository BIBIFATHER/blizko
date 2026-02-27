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
npm run -s build

echo "== tests (non-blocking) =="
if npm run -s test; then
  echo "OK: tests passed"
else
  echo "WARN: tests failed (non-blocking for smoke)"
fi

echo "OK: smoke finished (install+build required)"
