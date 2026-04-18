import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const workspaceRoot = process.cwd();

const textExtensions = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.cfg', '.conf',
  '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
  '.py', '.rb', '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.go', '.rs', '.java', '.kt', '.cs', '.cpp', '.c', '.h',
  '.php', '.swift', '.scala', '.r', '.lua', '.pl', '.ex', '.exs', '.hs', '.ml',
  '.html', '.css', '.scss', '.less', '.svg',
  '.sql', '.graphql', '.proto',
  '.env', '.properties',
]);

const formatterExtensions = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml', '.md', '.css', '.scss', '.html',
]);

const secretPatterns = [
  { name: 'AWS_ACCESS_KEY', severity: 'critical', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS_SECRET_KEY', severity: 'critical', regex: /aws_secret_access_key\s*[:=]\s*['"]?[A-Za-z0-9/+=]{40}/gi },
  { name: 'GCP_SERVICE_ACCOUNT', severity: 'critical', regex: /"type"\s*:\s*"service_account"/g },
  { name: 'GCP_API_KEY', severity: 'high', regex: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'AZURE_CLIENT_SECRET', severity: 'critical', regex: /azure[_-]?client[_-]?secret\s*[:=]\s*['"]?[A-Za-z0-9_~.-]{34,}/gi },
  { name: 'GITHUB_PAT', severity: 'critical', regex: /ghp_[0-9A-Za-z]{36}/g },
  { name: 'GITHUB_OAUTH', severity: 'critical', regex: /gho_[0-9A-Za-z]{36}/g },
  { name: 'GITHUB_APP_TOKEN', severity: 'critical', regex: /ghs_[0-9A-Za-z]{36}/g },
  { name: 'GITHUB_REFRESH_TOKEN', severity: 'critical', regex: /ghr_[0-9A-Za-z]{36}/g },
  { name: 'GITHUB_FINE_GRAINED_PAT', severity: 'critical', regex: /github_pat_[0-9A-Za-z_]{82}/g },
  { name: 'PRIVATE_KEY', severity: 'critical', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
  { name: 'PGP_PRIVATE_BLOCK', severity: 'critical', regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g },
  { name: 'GENERIC_SECRET', severity: 'high', regex: /(secret|token|password|passwd|pwd|api[_-]?key|apikey|access[_-]?key|auth[_-]?token|client[_-]?secret)\s*[:=]\s*['"]?[A-Za-z0-9_/+=~.-]{8,}/gi },
  { name: 'CONNECTION_STRING', severity: 'high', regex: /(mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp|mssql):\/\/[^\s'"]{10,}/gi },
  { name: 'BEARER_TOKEN', severity: 'medium', regex: /Bearer\s+[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/gi },
  { name: 'SLACK_TOKEN', severity: 'high', regex: /xox[baprs]-[0-9]{10,}-[0-9A-Za-z-]+/g },
  { name: 'SLACK_WEBHOOK', severity: 'high', regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]{8,}\/B[0-9A-Z]{8,}\/[0-9A-Za-z]{24}/g },
  { name: 'DISCORD_TOKEN', severity: 'high', regex: /[MN][A-Za-z0-9]{23,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g },
  { name: 'TWILIO_API_KEY', severity: 'high', regex: /SK[0-9a-fA-F]{32}/g },
  { name: 'SENDGRID_API_KEY', severity: 'high', regex: /SG\.[0-9A-Za-z_-]{22}\.[0-9A-Za-z_-]{43}/g },
  { name: 'STRIPE_SECRET_KEY', severity: 'critical', regex: /sk_live_[0-9A-Za-z]{24,}/g },
  { name: 'STRIPE_RESTRICTED_KEY', severity: 'high', regex: /rk_live_[0-9A-Za-z]{24,}/g },
  { name: 'NPM_TOKEN', severity: 'high', regex: /npm_[0-9A-Za-z]{36}/g },
  { name: 'JWT_TOKEN', severity: 'medium', regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'INTERNAL_IP_PORT', severity: 'medium', regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):\d{2,5}\b/g },
];

const guardianPatterns = [
  { category: 'destructive_file_ops', severity: 'critical', regex: /rm -rf \//i, suggestion: "Use targeted 'rm' on specific paths instead of root" },
  { category: 'destructive_file_ops', severity: 'critical', regex: /rm -rf ~/i, suggestion: "Use targeted 'rm' on specific paths instead of home directory" },
  { category: 'destructive_file_ops', severity: 'critical', regex: /rm -rf \./i, suggestion: "Use targeted 'rm' on specific files instead of current directory" },
  { category: 'destructive_file_ops', severity: 'critical', regex: /rm -rf \.\./i, suggestion: 'Never remove parent directories recursively' },
  { category: 'destructive_file_ops', severity: 'critical', regex: /(rm|del|unlink).*\.env/i, suggestion: "Use 'mv' to back up .env files before removing" },
  { category: 'destructive_file_ops', severity: 'critical', regex: /(rm|del|unlink).*\.git[^i]/i, suggestion: 'Never delete .git directory' },
  { category: 'destructive_git_ops', severity: 'critical', regex: /git push --force.*(main|master)/i, suggestion: "Use 'git push --force-with-lease' or push to a feature branch" },
  { category: 'destructive_git_ops', severity: 'critical', regex: /git push -f.*(main|master)/i, suggestion: "Use 'git push --force-with-lease' or push to a feature branch" },
  { category: 'destructive_git_ops', severity: 'high', regex: /git reset --hard/i, suggestion: "Use 'git stash' to preserve changes, or 'git reset --soft'" },
  { category: 'destructive_git_ops', severity: 'high', regex: /git clean -fd/i, suggestion: "Use 'git clean -n' first to preview what will be deleted" },
  { category: 'database_destruction', severity: 'critical', regex: /DROP TABLE/i, suggestion: "Use 'ALTER TABLE' or create a migration with rollback support" },
  { category: 'database_destruction', severity: 'critical', regex: /DROP DATABASE/i, suggestion: 'Create a backup first; consider revoking DROP privileges' },
  { category: 'database_destruction', severity: 'critical', regex: /TRUNCATE/i, suggestion: "Use 'DELETE FROM ... WHERE' with a condition for safer data removal" },
  { category: 'database_destruction', severity: 'high', regex: /DELETE FROM [a-zA-Z_]+\s*;/i, suggestion: "Add a WHERE clause to 'DELETE FROM' to avoid deleting all rows" },
  { category: 'permission_abuse', severity: 'high', regex: /chmod -R 777/i, suggestion: "Use specific permissions ('chmod -R 755') and limit scope" },
  { category: 'permission_abuse', severity: 'high', regex: /chmod 777/i, suggestion: "Use 'chmod 755' for directories or 'chmod 644' for files" },
  { category: 'network_exfiltration', severity: 'critical', regex: /curl.*\|.*bash/i, suggestion: 'Download the script first, review it, then execute' },
  { category: 'network_exfiltration', severity: 'critical', regex: /wget.*\|.*sh/i, suggestion: 'Download the script first, review it, then execute' },
  { category: 'network_exfiltration', severity: 'high', regex: /curl.*--data.*@/i, suggestion: "Review what data is being sent before using 'curl --data @file'" },
  { category: 'system_danger', severity: 'high', regex: /sudo\s+/i, suggestion: "Avoid 'sudo' - run commands with the least privilege needed" },
  { category: 'system_danger', severity: 'high', regex: /npm publish/i, suggestion: "Use 'npm publish --dry-run' first to verify package contents" },
];

async function main() {
  const action = process.argv[2];
  if (!action) {
    throw new Error('Missing hook action');
  }

  const input = await readJsonFromStdin();

  switch (action) {
    case 'session-start':
      await handleSessionStart(input);
      return;
    case 'session-end':
      await handleSessionEnd(input);
      return;
    case 'log-prompt':
      await handlePromptLog(input);
      return;
    case 'tool-guardian':
      await handleToolGuardian(input);
      return;
    case 'format-lint':
      await handleFormatLint(input);
      return;
    case 'scan-secrets':
      await handleSecretsScan();
      return;
    default:
      throw new Error(`Unknown hook action: ${action}`);
  }
}

async function handleSessionStart(input) {
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

async function handleSessionEnd(input) {
  if (isTrue(process.env.SKIP_LOGGING)) {
    return;
  }

  await appendJsonLine(path.join(getLogDir('copilot'), 'session.log'), {
    timestamp: nowIso(),
    event: 'sessionEnd',
    reason: readString(input.reason, 'unknown'),
  });
}

async function handlePromptLog(input) {
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

async function handleToolGuardian(input) {
  if (isTrue(process.env.SKIP_TOOL_GUARD)) {
    return;
  }

  const context = normalizeToolContext(input);
  const combinedText = `${context.toolName} ${extractCommandText(context.toolArgs)}`.trim();
  const allowlist = splitList(process.env.TOOL_GUARD_ALLOWLIST);
  const logFile = path.join(getLogDir('copilot'), 'tool-guardian.log');

  if (allowlist.some((pattern) => combinedText.includes(pattern))) {
    await appendJsonLine(logFile, {
      timestamp: nowIso(),
      event: 'guard_skipped',
      reason: 'allowlisted',
      tool: context.toolName,
    });
    return;
  }

  const threats = guardianPatterns.flatMap((pattern) => {
    const match = combinedText.match(pattern.regex);
    if (!match) {
      return [];
    }

    return [{
      category: pattern.category,
      severity: pattern.severity,
      match: match[0],
      suggestion: pattern.suggestion,
    }];
  });

  if (threats.length === 0) {
    await appendJsonLine(logFile, {
      timestamp: nowIso(),
      event: 'guard_passed',
      mode: readString(process.env.GUARD_MODE, 'warn'),
      tool: context.toolName,
    });
    return;
  }

  const mode = readString(process.env.GUARD_MODE, 'warn');
  await appendJsonLine(logFile, {
    timestamp: nowIso(),
    event: 'threats_detected',
    mode,
    tool: context.toolName,
    threat_count: threats.length,
    threats,
  });

  if (mode === 'block') {
    const reason = `Dangerous command detected: ${threats[0].category}`;
    process.stdout.write(JSON.stringify({
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }));
  }
}

async function handleFormatLint(input) {
  if (isTrue(process.env.SKIP_FORMAT_LINT)) {
    return;
  }

  const context = normalizeToolContext(input);
  const logFile = path.join(getLogDir('copilot'), 'format-lint.log');
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

async function handleSecretsScan() {
  if (isTrue(process.env.SKIP_SECRETS_SCAN)) {
    return;
  }

  const logFile = path.join(getLogDir('copilot'), 'scan.log');
  const gitAvailable = await isGitRepository();
  if (!gitAvailable) {
    await appendJsonLine(logFile, {
      timestamp: nowIso(),
      event: 'scan_complete',
      mode: readString(process.env.SCAN_MODE, 'warn'),
      scope: readString(process.env.SCAN_SCOPE, 'diff'),
      status: 'skipped_not_git',
      files_scanned: 0,
    });
    return;
  }

  const mode = readString(process.env.SCAN_MODE, 'warn');
  const scope = readString(process.env.SCAN_SCOPE, 'diff');
  const allowlist = splitList(process.env.SECRETS_ALLOWLIST);
  const files = await getFilesToScan(scope);

  if (files.length === 0) {
    await appendJsonLine(logFile, {
      timestamp: nowIso(),
      event: 'scan_complete',
      mode,
      scope,
      status: 'clean',
      files_scanned: 0,
    });
    return;
  }

  const findings = [];
  for (const filePath of files) {
    if (!(await isLikelyTextFile(filePath))) {
      continue;
    }

    const content = scope === 'staged'
      ? await readStagedFile(filePath)
      : await readWorkspaceFile(filePath);

    if (content === undefined) {
      continue;
    }

    findings.push(...findSecrets(filePath, content, allowlist));
  }

  if (findings.length === 0) {
    await appendJsonLine(logFile, {
      timestamp: nowIso(),
      event: 'scan_complete',
      mode,
      scope,
      status: 'clean',
      files_scanned: files.length,
    });
    return;
  }

  await appendJsonLine(logFile, {
    timestamp: nowIso(),
    event: 'secrets_found',
    mode,
    scope,
    files_scanned: files.length,
    finding_count: findings.length,
    findings,
  });

  if (mode === 'block') {
    process.exitCode = 1;
  }
}

function normalizeToolContext(input) {
  const toolName = readString(input.toolName ?? input.tool_name, '');
  const rawToolArgs = input.toolArgs ?? input.tool_input ?? {};
  const toolArgs = typeof rawToolArgs === 'string'
    ? tryParseJson(rawToolArgs) ?? { raw: rawToolArgs }
    : (rawToolArgs && typeof rawToolArgs === 'object' ? rawToolArgs : {});

  return { toolName, toolArgs, rawInput: input };
}

function extractCommandText(toolArgs) {
  const direct = [toolArgs.command, toolArgs.cmd, toolArgs.input, toolArgs.raw]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  if (direct) {
    return direct;
  }

  return JSON.stringify(toolArgs);
}

async function collectTargetFiles(context) {
  const candidates = [];
  const args = context.toolArgs;
  for (const key of ['path', 'filePath', 'file']) {
    if (typeof args[key] === 'string') {
      candidates.push(resolveWorkspacePath(args[key]));
    }
  }

  if (typeof args.input === 'string') {
    for (const match of args.input.matchAll(/^\*\*\* (?:Add|Update) File: (.+)$/gm)) {
      candidates.push(resolveWorkspacePath(match[1].trim()));
    }
  }

  const existingFiles = [];
  for (const filePath of candidates) {
    if (filePath && await fileExists(filePath)) {
      existingFiles.push(filePath);
    }
  }

  return [...new Set(existingFiles)];
}

async function isGitRepository() {
  const result = await tryRun('git', ['rev-parse', '--is-inside-work-tree']);
  return result.ok && result.stdout.trim() === 'true';
}

async function getFilesToScan(scope) {
  const changed = new Set();
  if (scope === 'staged') {
    const staged = await readGitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
    for (const file of staged) {
      changed.add(file);
    }
  } else {
    const diffHead = await readGitLines(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']);
    const diffWorkingTree = diffHead.length > 0 ? diffHead : await readGitLines(['diff', '--name-only', '--diff-filter=ACMR']);
    for (const file of diffWorkingTree) {
      changed.add(file);
    }
    for (const file of await readGitLines(['ls-files', '--others', '--exclude-standard'])) {
      changed.add(file);
    }
  }

  return [...changed];
}

function findSecrets(filePath, content, allowlist) {
  if (isLockFile(filePath)) {
    return [];
  }

  const findings = [];
  for (const pattern of secretPatterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    for (const match of content.matchAll(regex)) {
      const fragment = match[0];
      if (!fragment) {
        continue;
      }
      if (allowlist.some((entry) => fragment.includes(entry))) {
        continue;
      }
      if (looksLikePlaceholder(fragment)) {
        continue;
      }

      findings.push({
        file: filePath,
        line: lineNumberFromIndex(content, match.index ?? 0),
        pattern: pattern.name,
        severity: pattern.severity,
        match: redact(fragment),
      });
    }
  }

  return findings;
}

function lineNumberFromIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function looksLikePlaceholder(value) {
  return /(example|placeholder|your[_-]|xxx|changeme|todo|fixme|replace[_-]?me|dummy|fake|test[_-]?key|sample)/i.test(value);
}

function redact(value) {
  if (value.length <= 12) {
    return '[REDACTED]';
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function isLockFile(filePath) {
  return /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|go\.sum|[^/]+\.lock)$/.test(filePath);
}

async function readWorkspaceFile(filePath) {
  const absolutePath = resolveWorkspacePath(filePath);
  if (!absolutePath || !(await fileExists(absolutePath))) {
    return undefined;
  }

  return fs.readFile(absolutePath, 'utf8');
}

async function readStagedFile(filePath) {
  const result = await tryRun('git', ['show', `:${filePath}`]);
  return result.ok ? result.stdout : undefined;
}

async function isLikelyTextFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (textExtensions.has(extension)) {
    return true;
  }

  const absolutePath = resolveWorkspacePath(filePath);
  if (!absolutePath || !(await fileExists(absolutePath))) {
    return false;
  }

  const handle = await fs.open(absolutePath, 'r');
  try {
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    for (let index = 0; index < bytesRead; index += 1) {
      if (buffer[index] === 0) {
        return false;
      }
    }
    return true;
  } finally {
    await handle.close();
  }
}

async function findExecutable(name) {
  const localPath = path.join(workspaceRoot, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
  if (await fileExists(localPath)) {
    return localPath;
  }

  const probe = await tryRun(name, ['--version']);
  return probe.ok ? name : undefined;
}

async function tryRun(command, args, options = {}) {
  try {
    const result = await runCommand(command, args, options);
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      error,
    };
  }
}

async function readGitLines(args) {
  const result = await tryRun('git', args);
  if (!result.ok) {
    return [];
  }

  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? workspaceRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(Object.assign(error, { stdout, stderr }));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(Object.assign(new Error(`${command} exited with code ${code}`), { code, stdout, stderr }));
    });

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
}

async function readJsonFromStdin() {
  const raw = await readAllStdin();
  if (!raw.trim()) {
    return {};
  }

  const parsed = tryParseJson(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function readAllStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => {
      resolve(input);
    });
  });
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function getLogDir(name) {
  return path.resolve(workspaceRoot, `.github/logs/${name}`);
}

async function appendJsonLine(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function resolveWorkspacePath(filePath) {
  if (!filePath) {
    return undefined;
  }
  return path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function splitArgs(value) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function splitList(value) {
  return readString(value, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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

function readString(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function isTrue(value) {
  return String(value).toLowerCase() === 'true';
}

function nowIso() {
  return new Date().toISOString();
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await appendJsonLine(path.join(getLogDir('copilot'), 'hook-errors.log'), {
    timestamp: nowIso(),
    event: 'hook_error',
    message,
  });
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});