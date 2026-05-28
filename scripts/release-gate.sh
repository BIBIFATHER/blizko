#!/usr/bin/env bash
#
# Release gate — исполняемая версия .context/CODEX_RELEASE_PROTOCOL.md.
# Прогоняет все обязательные проверки и падает (exit 1), если хоть одна не прошла
# или в рабочем дереве остались незакоммиченные PRODUCT-файлы.
# Допустимо-dirty (намеренно не коммитятся): memory/*, MEMORY.md, .claude/, .agents/,
# BOOTSTRAP.md — это локальный tooling/память агента, не продуктовый код.
#
set -uo pipefail
cd "$(dirname "$0")/.."

FAIL=0
ok()  { printf "  \033[32m✅ %s\033[0m\n" "$1"; }
bad() { printf "  \033[31m❌ %s\033[0m\n" "$1"; FAIL=1; }
sec() { printf "\n=== %s ===\n" "$1"; }

PRODUCT_GLOBS=(
  'App.tsx' 'index.css' 'index.html'
  'src/**/*.{ts,tsx}' 'api/**/*.ts'
  'vite.config.ts' 'vitest.config.ts' 'eslint.config.js' 'tsconfig.json' 'package.json'
)

sec "Repository hygiene"
# Dirty product = всё, кроме tooling/памяти агента (memory/, MEMORY.md, .claude/, .agents/, BOOTSTRAP.md)
DIRTY_PRODUCT="$(git status --porcelain | sed 's/^...//' | grep -vE '^(MEMORY\.md|memory/|\.claude/|\.agents/|BOOTSTRAP\.md)' || true)"
if [ -n "$DIRTY_PRODUCT" ]; then
  bad "Незакоммиченные product-файлы (закоммить перед релизом):"
  echo "$DIRTY_PRODUCT" | sed 's/^/      /'
else
  ok "Product-дерево чистое (dirty только tooling/память — допустимо)"
fi
printf "  latest commit: %s %s\n" "$(git rev-parse --short HEAD)" "$(git log -1 --pretty=%s)"

sec "ESLint (0 warnings)"
if npx eslint . --max-warnings 0 >/tmp/gate-lint.log 2>&1; then ok "0 errors / 0 warnings"; else bad "lint failed"; tail -20 /tmp/gate-lint.log; fi

sec "TypeScript (tsc --noEmit)"
if npx tsc --noEmit >/tmp/gate-tsc.log 2>&1; then ok "типы зелёные"; else bad "tsc errors"; tail -20 /tmp/gate-tsc.log; fi

sec "Prettier (product scope)"
if npx prettier --check "${PRODUCT_GLOBS[@]}" >/tmp/gate-prettier.log 2>&1; then ok "формат чистый"; else bad "format issues"; tail -10 /tmp/gate-prettier.log; fi

sec "Tests"
if npm test >/tmp/gate-test.log 2>&1; then ok "$(grep -E 'Tests +[0-9]' /tmp/gate-test.log | tail -1 | sed 's/^ *//')"; else bad "tests failed"; tail -20 /tmp/gate-test.log; fi

sec "Build"
if npm run build >/tmp/gate-build.log 2>&1; then ok "vite build ok"; else bad "build failed"; tail -20 /tmp/gate-build.log; fi

sec "Whitespace (git diff --check)"
if git diff --check >/dev/null 2>&1; then ok "нет whitespace-ошибок"; else bad "whitespace errors"; git diff --check; fi

sec "Result"
if [ "$FAIL" -eq 0 ]; then
  printf "  \033[32m✅ RELEASE GATE PASSED\033[0m\n"; exit 0
else
  printf "  \033[31m❌ RELEASE GATE FAILED\033[0m\n"; exit 1
fi
