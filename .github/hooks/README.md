# Copilot Hooks

These hooks run through `.github/hooks/hook-runner.mjs` instead of shell scripts.

Why:
- Removes the hard dependency on Bash, `jq`, `grep`, `sed`, and `file`
- Uses one implementation path for macOS, Linux, and Windows
- Keeps the existing hook events and log locations stable

Runtime requirements:
- `node` must be available on `PATH`
- `git` is required for the secrets scan hook
- `ruff` and `prettier` remain optional; the format hook skips them when unavailable and writes install hints to the format-lint log

The hook configuration still uses the GitHub Copilot JSON format in `hooks.json`, but both Unix and Windows entries now execute the same Node runner.