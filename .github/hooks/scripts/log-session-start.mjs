import { handleSessionStart } from '../lib/logging-hooks.mjs';
import { runHookScript } from '../lib/script-runtime.mjs';

await runHookScript(handleSessionStart);