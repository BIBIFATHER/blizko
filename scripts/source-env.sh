#!/usr/bin/env sh

_env_file="${1:-.env.local}"

case "$_env_file" in
  /*) _env_path="$_env_file" ;;
  *) _env_path="$(pwd)/$_env_file" ;;
esac

if [ ! -f "$_env_path" ]; then
  echo "Missing env file: $_env_path" >&2
  return 1 2>/dev/null || exit 1
fi

set -a
. "$_env_path"
set +a

echo "Loaded environment from $_env_path"
