import path from 'node:path';
import { promises as fs } from 'node:fs';

import {
  appendJsonLine,
  fileExists,
  getResolvedLogDir,
  isTrue,
  nowIso,
  readString,
  resolveWorkspacePath,
  splitList,
} from './core.mjs';
import { readGitLines, tryRun } from './process-utils.mjs';

const textExtensions = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.cfg', '.conf',
  '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
  '.py', '.rb', '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.go', '.rs', '.java', '.kt', '.cs', '.cpp', '.c', '.h',
  '.php', '.swift', '.scala', '.r', '.lua', '.pl', '.ex', '.exs', '.hs', '.ml',
  '.html', '.css', '.scss', '.less', '.svg',
  '.sql', '.graphql', '.proto',
  '.env', '.properties',
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

export async function handleSecretsScan() {
  if (isTrue(process.env.SKIP_SECRETS_SCAN)) {
    return;
  }

  const logFile = path.join(getResolvedLogDir('SECRETS_LOG_DIR'), 'scan.log');
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
      if (isPatternDefinitionLine(content, match.index ?? 0)) {
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

function isPatternDefinitionLine(text, index) {
  const line = getLineAtIndex(text, index);
  return line.includes('regex: /');
}

function getLineAtIndex(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const lineEnd = text.indexOf('\n', index);
  return text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
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