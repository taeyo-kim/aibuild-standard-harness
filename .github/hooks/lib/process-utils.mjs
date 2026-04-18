import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

import { fileExists, workspaceRoot } from './core.mjs';

export async function findExecutable(name) {
  const localPath = path.join(workspaceRoot, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
  if (await fileExists(localPath)) {
    return localPath;
  }

  const probe = await tryRun(name, ['--version']);
  return probe.ok ? name : undefined;
}

export async function tryRun(command, args, options = {}) {
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

export async function readGitLines(args) {
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