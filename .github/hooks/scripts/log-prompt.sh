#!/bin/bash

# Log user prompt submission

set -euo pipefail

# Skip if logging disabled
if [[ "${SKIP_LOGGING:-}" == "true" ]]; then
  exit 0
fi

# Read input from Copilot (contains prompt info)
INPUT=$(cat)

# Create logs directory if it doesn't exist
mkdir -p .github/logs/copilot

# Extract timestamp, cwd, and prompt text
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // "unknown"' 2>/dev/null || echo "unknown")
PROMPT=$(printf '%s' "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || echo "")

# Log with prompt content
jq -n \
  --arg timestamp "$TIMESTAMP" \
  --arg cwd "$CWD" \
  --arg prompt "$PROMPT" \
  --arg level "${LOG_LEVEL:-INFO}" \
  '{"timestamp":$timestamp,"event":"userPromptSubmitted","cwd":$cwd,"prompt":$prompt,"level":$level}' \
  >> .github/logs/copilot/prompts.log

exit 0
