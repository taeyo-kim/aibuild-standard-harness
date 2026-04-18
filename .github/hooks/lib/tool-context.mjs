import {
  fileExists,
  resolveWorkspacePath,
  tryParseJson,
  readString,
} from './core.mjs';

export function normalizeToolContext(input) {
  const toolName = readString(input.toolName ?? input.tool_name, '');
  const rawToolArgs = input.toolArgs ?? input.tool_input ?? {};
  const toolArgs = typeof rawToolArgs === 'string'
    ? tryParseJson(rawToolArgs) ?? { raw: rawToolArgs }
    : (rawToolArgs && typeof rawToolArgs === 'object' ? rawToolArgs : {});

  return { toolName, toolArgs, rawInput: input };
}

export function extractCommandText(toolArgs) {
  const direct = [toolArgs.command, toolArgs.cmd, toolArgs.input, toolArgs.raw]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  if (direct) {
    return direct;
  }

  return JSON.stringify(toolArgs);
}

export async function collectTargetFiles(context) {
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