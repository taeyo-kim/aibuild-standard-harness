import process from 'node:process';
import { handleFormatLint } from './lib/format-lint.mjs';
import { logHookError, readJsonFromStdin } from './lib/core.mjs';
import { handleSessionEnd, handleSessionStart, handlePromptLog } from './lib/logging-hooks.mjs';
import { handleSecretsScan } from './lib/secrets-scan.mjs';
import { handleToolGuardian } from './lib/tool-guardian.mjs';

const actions = {
  'session-start': handleSessionStart,
  'session-end': handleSessionEnd,
  'log-prompt': handlePromptLog,
  'tool-guardian': handleToolGuardian,
  'format-lint': handleFormatLint,
  'scan-secrets': handleSecretsScan,
};

async function main() {
  const action = process.argv[2];
  if (!action) {
    throw new Error('Missing hook action');
  }

  const handler = actions[action];
  if (!handler) {
    throw new Error(`Unknown hook action: ${action}`);
  }

  const input = await readJsonFromStdin();
  await handler(input);
}

main().catch(async (error) => {
  const message = await logHookError(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});