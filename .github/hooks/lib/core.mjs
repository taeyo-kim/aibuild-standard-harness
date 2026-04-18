import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const workspaceRoot = process.cwd();

export async function readJsonFromStdin() {
  const raw = await readAllStdin();
  if (!raw.trim()) {
    return {};
  }

  const parsed = tryParseJson(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

export function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function getLogDir(name) {
  return path.resolve(workspaceRoot, `.github/logs/${name}`);
}

export function getResolvedLogDir(envVarName, fallbackName = 'copilot') {
  const override = readString(process.env[envVarName], '');
  return override ? path.resolve(workspaceRoot, override) : getLogDir(fallbackName);
}

export async function appendJsonLine(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

export function resolveWorkspacePath(filePath) {
  if (!filePath) {
    return undefined;
  }

  return path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function splitArgs(value) {
  return value.trim().split(/\s+/).filter(Boolean);
}

export function splitList(value) {
  return readString(value, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function readString(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function isTrue(value) {
  return String(value).toLowerCase() === 'true';
}

export function nowIso() {
  return new Date().toISOString();
}

export async function logHookError(error) {
  const message = error instanceof Error ? error.message : String(error);
  await appendJsonLine(path.join(getLogDir('copilot'), 'hook-errors.log'), {
    timestamp: nowIso(),
    event: 'hook_error',
    message,
  });
  return message;
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