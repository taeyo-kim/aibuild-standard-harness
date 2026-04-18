import path from 'node:path';

import {
  appendJsonLine,
  getResolvedLogDir,
  isTrue,
  nowIso,
  readString,
  splitArgs,
} from './core.mjs';
import { findExecutable, tryRun } from './process-utils.mjs';
import { collectTargetFiles, normalizeToolContext } from './tool-context.mjs';

const formatterExtensions = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml', '.md', '.css', '.scss', '.html',
]);

export async function handleFormatLint(input) {
  if (isTrue(process.env.SKIP_FORMAT_LINT)) {
    return;
  }

  const context = normalizeToolContext(input);
  const logFile = path.join(getResolvedLogDir('FORMAT_LOG_DIR'), 'format-lint.log');
  const filePaths = await collectTargetFiles(context);

  if (filePaths.length === 0) {
    return;
  }

  const results = [];
  for (const filePath of filePaths) {
    const extension = path.extname(filePath).toLowerCase();
    const actions = [];
    const errors = [];
    const notes = [];

    if (extension === '.py') {
      const ruff = await findExecutable('ruff');
      if (ruff) {
        const ruffArgs = splitArgs(readString(process.env.RUFF_ARGS, '--fix'));
        const lintResult = await tryRun(ruff, ['check', ...ruffArgs, filePath]);
        if (lintResult.ok) {
          actions.push('ruff check: ok');
        } else {
          errors.push('ruff check: issues found or failed');
        }

        const formatResult = await tryRun(ruff, ['format', filePath]);
        if (formatResult.ok) {
          actions.push('ruff format: ok');
        } else {
          errors.push('ruff format: failed');
        }
      } else {
        actions.push('ruff: not installed, skipped');
        notes.push(getInstallHint('ruff'));
      }
    }

    if (formatterExtensions.has(extension)) {
      const prettier = await findExecutable('prettier');
      if (prettier) {
        const prettierArgs = splitArgs(readString(process.env.PRETTIER_ARGS, '--write'));
        const prettierResult = await tryRun(prettier, [...prettierArgs, filePath]);
        if (prettierResult.ok) {
          actions.push('prettier: ok');
        } else {
          errors.push('prettier: failed');
        }
      } else {
        actions.push('prettier: not installed, skipped');
        notes.push(getInstallHint('prettier'));
      }
    }

    results.push({
      file: filePath,
      status: errors.length > 0 ? 'warn' : 'ok',
      actions,
      errors,
      notes,
    });
  }

  await appendJsonLine(logFile, {
    timestamp: nowIso(),
    event: 'format_lint',
    tool: context.toolName,
    files: results,
  });
}

function getInstallHint(toolName) {
  switch (toolName) {
    case 'ruff':
      return 'ruff is missing. Install with `pip install ruff`, `uv tool install ruff`, or add it to the project environment.';
    case 'prettier':
      return 'prettier is missing. Install with `npm install --save-dev prettier`, `pnpm add -D prettier`, or `npm install --global prettier`.';
    default:
      return `${toolName} is missing. Install it and rerun the hook.`;
  }
}