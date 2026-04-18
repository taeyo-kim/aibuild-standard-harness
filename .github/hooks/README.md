# Copilot Hooks

These hooks now use feature-specific Node entrypoints under `.github/hooks/scripts/`.

Structure:
- `.github/hooks/scripts/*.mjs`: active per-feature hook entrypoints
- `.github/hooks/lib/*.mjs`: shared utilities and feature logic
- `.github/hooks/hook-runner.mjs`: compatibility dispatcher for direct action-based invocation

Why:
- Replaces the old per-feature Bash scripts with per-feature Node scripts
- Keeps the code split by responsibility instead of concentrating everything in one file
- Uses one cross-platform implementation path for macOS, Linux, and Windows

Runtime requirements:
- `node` must be available on `PATH`
- `git` is required for the secrets scan hook
- `ruff` and `prettier` remain optional; the format hook skips them when unavailable and writes install hints to the format-lint log

The hook configuration still uses the GitHub Copilot JSON format in `hooks.json`, but both Unix and Windows entries now execute the corresponding script in `.github/hooks/scripts/`.