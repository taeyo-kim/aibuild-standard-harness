#!/bin/bash

# Format & Lint Hook (postToolUse)
# Runs ruff (Python lint + format) and prettier (JS/TS/JSON/YAML/MD)
# on the file the agent just edited or created.
#
# Environment variables:
#   SKIP_FORMAT_LINT   - "true" to disable entirely (default: unset)
#   FORMAT_LOG_DIR     - Directory for logs (default: .github/logs/copilot)
#   RUFF_ARGS          - Extra args passed to ruff check (default: --fix)
#   PRETTIER_ARGS      - Extra args passed to prettier (default: --write)

set -euo pipefail

if [[ "${SKIP_FORMAT_LINT:-}" == "true" ]]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Read postToolUse input
# { "toolName": "edit"|"create", "toolArgs": "{\"path\":\"...\",\"...\":\"...\"}" }
# ---------------------------------------------------------------------------
INPUT=$(cat)

LOG_DIR="${FORMAT_LOG_DIR:-.github/logs/copilot}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/format-lint.log"

# Only act on file-editing tools
TOOL_NAME=""
if command -v jq &>/dev/null; then
  TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.toolName // empty' 2>/dev/null || echo "")
fi

case "$TOOL_NAME" in
  edit|create|write_file|str_replace_editor) ;;   # proceed
  *) exit 0 ;;                                     # skip other tools
esac

# Extract file path from toolArgs
FILE_PATH=""
if command -v jq &>/dev/null; then
  TOOL_ARGS_RAW=$(printf '%s' "$INPUT" | jq -r '.toolArgs // empty' 2>/dev/null || echo "")
  if [[ -n "$TOOL_ARGS_RAW" ]]; then
    # Try .path, then .filePath, then .file
    FILE_PATH=$(printf '%s' "$TOOL_ARGS_RAW" | jq -r '.path // .filePath // .file // empty' 2>/dev/null || echo "")
  fi
fi

if [[ -z "$FILE_PATH" ]] || [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

EXT="${FILE_PATH##*.}"
RUFF_ARGS="${RUFF_ARGS:---fix}"
PRETTIER_ARGS="${PRETTIER_ARGS:---write}"
ACTIONS=()
ERRORS=()

# ---------------------------------------------------------------------------
# ruff — Python files
# ---------------------------------------------------------------------------
if [[ "$EXT" == "py" ]]; then
  if command -v ruff &>/dev/null; then
    # 1. lint + auto-fix
    if ruff check $RUFF_ARGS "$FILE_PATH" 2>&1; then
      ACTIONS+=("ruff check --fix: ok")
    else
      ERRORS+=("ruff check: issues found (auto-fixed where possible)")
    fi
    # 2. format
    if ruff format "$FILE_PATH" 2>&1; then
      ACTIONS+=("ruff format: ok")
    else
      ERRORS+=("ruff format: failed")
    fi
  else
    ACTIONS+=("ruff: not installed, skipped")
  fi
fi

# ---------------------------------------------------------------------------
# prettier — JS / TS / JSX / TSX / JSON / YAML / MD / CSS / HTML
# ---------------------------------------------------------------------------
case "$EXT" in
  js|ts|jsx|tsx|json|yaml|yml|md|css|scss|html)
    if command -v prettier &>/dev/null; then
      if prettier $PRETTIER_ARGS "$FILE_PATH" 2>&1; then
        ACTIONS+=("prettier: ok")
      else
        ERRORS+=("prettier: failed on $FILE_PATH")
      fi
    else
      ACTIONS+=("prettier: not installed, skipped")
    fi
    ;;
esac

# ---------------------------------------------------------------------------
# Log result
# ---------------------------------------------------------------------------
STATUS="ok"
[[ ${#ERRORS[@]} -gt 0 ]] && STATUS="warn"

ACTIONS_STR=$(IFS=","; echo "${ACTIONS[*]:-none}")
ERRORS_STR=$(IFS=","; echo "${ERRORS[*]:-none}")

printf '{"timestamp":"%s","event":"format_lint","tool":"%s","file":"%s","status":"%s","actions":"%s","errors":"%s"}\n' \
  "$TIMESTAMP" "$TOOL_NAME" "$FILE_PATH" "$STATUS" "$ACTIONS_STR" "$ERRORS_STR" >> "$LOG_FILE"

exit 0
