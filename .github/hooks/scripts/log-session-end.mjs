import { handleSessionEnd } from '../lib/logging-hooks.mjs';
import { runHookScript } from '../lib/script-runtime.mjs';

await runHookScript(handleSessionEnd);