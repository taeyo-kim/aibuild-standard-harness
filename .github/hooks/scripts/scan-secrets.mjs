import { runHookScript } from '../lib/script-runtime.mjs';
import { handleSecretsScan } from '../lib/secrets-scan.mjs';

await runHookScript(handleSecretsScan);