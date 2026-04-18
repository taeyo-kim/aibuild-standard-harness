#!/bin/bash

# Log session start event

set -euo pipefail

# Skip if logging disabled
if [[ "${SKIP_LOGGING:-}" == "true" ]]; then
  exit 0
fi

# Read input from Copilot
INPUT=$(cat)

# Create logs directory if it doesn't exist
mkdir -p .github/logs/copilot

# Extract timestamp and session info
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CWD=$(pwd)
SOURCE=$(printf '%s' "$INPUT" | jq -r '.source // "unknown"' 2>/dev/null || echo "unknown")

# Log session start
jq -Rn --arg timestamp "$TIMESTAMP" --arg cwd "$CWD" --arg source "$SOURCE" \
  '{"timestamp":$timestamp,"event":"sessionStart","cwd":$cwd,"source":$source}' \
  >> .github/logs/copilot/session.log

echo "📝 Session logged"
exit 0
