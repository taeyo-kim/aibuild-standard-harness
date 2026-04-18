import { handleFormatLint } from '../lib/format-lint.mjs';
import { runHookScript } from '../lib/script-runtime.mjs';

await runHookScript(handleFormatLint);