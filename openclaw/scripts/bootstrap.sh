#!/usr/bin/env bash
set -euo pipefail

command -v node >/dev/null || { echo "Node missing"; exit 1; }
command -v npm  >/dev/null || { echo "npm missing"; exit 1; }

npm i -g openclaw
openclaw --version

echo "OK: OpenClaw installed (tool mode)"
