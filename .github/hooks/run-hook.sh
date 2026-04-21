#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
action=${1-}

if [ -z "$action" ]; then
  echo "Missing hook action" >&2
  exit 1
fi

resolve_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  for candidate in \
    "${NODE_BINARY:-}" \
    "/opt/homebrew/bin/node" \
    "/usr/local/bin/node" \
    "/usr/bin/node" \
    "$HOME/.volta/bin/node" \
    "$HOME/.fnm/current/bin/node" \
    "$HOME/.asdf/shims/node"; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  for candidate in "$HOME"/.nvm/versions/node/*/bin/node; do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

node_bin=$(resolve_node) || {
  echo "Node.js executable was not found. Install Node.js or expose it on PATH for Copilot hooks." >&2
  exit 127
}

exec "$node_bin" "$script_dir/hook-runner.mjs" "$action"