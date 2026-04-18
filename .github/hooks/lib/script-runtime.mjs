import process from 'node:process';

import { logHookError, readJsonFromStdin } from './core.mjs';

export async function runHookScript(handler) {
  try {
    const input = await readJsonFromStdin();
    await handler(input);
  } catch (error) {
    const message = await logHookError(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}