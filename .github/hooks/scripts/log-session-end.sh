#!/bin/bash

# Log session end event

set -euo pipefail

# Skip if logging disabled
if [[ "${SKIP_LOGGING:-}" == "true" ]]; then
  exit 0
fi

# Read input from Copilot
INPUT=$(cat)

# Create logs directory if it doesn't exist
mkdir -p .github/logs/copilot

# Extract timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REASON=$(printf '%s' "$INPUT" | jq -r '.reason // "unknown"' 2>/dev/null || echo "unknown")

# Log session end
echo "{\"timestamp\":\"$TIMESTAMP\",\"event\":\"sessionEnd\",\"reason\":\"$REASON\"}" >> .github/logs/copilot/session.log

echo "📝 Session end logged"
exit 0
