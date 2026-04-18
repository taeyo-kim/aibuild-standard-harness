import path from 'node:path';

import {
  appendJsonLine,
  getLogDir,
  isTrue,
  nowIso,
  readString,
  workspaceRoot,
} from './core.mjs';

export async function handleSessionStart(input) {
  if (isTrue(process.env.SKIP_LOGGING)) {
    return;
  }

  await appendJsonLine(path.join(getLogDir('copilot'), 'session.log'), {
    timestamp: nowIso(),
    event: 'sessionStart',
    cwd: workspaceRoot,
    source: readString(input.source, 'unknown'),
  });
}

export async function handleSessionEnd(input) {
  if (isTrue(process.env.SKIP_LOGGING)) {
    return;
  }

  await appendJsonLine(path.join(getLogDir('copilot'), 'session.log'), {
    timestamp: nowIso(),
    event: 'sessionEnd',
    reason: readString(input.reason, 'unknown'),
  });
}

export async function handlePromptLog(input) {
  if (isTrue(process.env.SKIP_LOGGING)) {
    return;
  }

  await appendJsonLine(path.join(getLogDir('copilot'), 'prompts.log'), {
    timestamp: nowIso(),
    event: 'userPromptSubmitted',
    cwd: readString(input.cwd, workspaceRoot),
    prompt: readString(input.prompt, ''),
    level: readString(process.env.LOG_LEVEL, 'INFO'),
  });
}