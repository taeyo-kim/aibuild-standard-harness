import path from 'node:path';

import {
  appendJsonLine,
  getResolvedLogDir,
  isTrue,
  nowIso,
  readString,
  splitList,
} from './core.mjs';
import { extractCommandText, normalizeToolContext } from './tool-context.mjs';

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

export async function handleToolGuardian(input) {
  if (isTrue(process.env.SKIP_TOOL_GUARD)) {
    return;
  }

  const context = normalizeToolContext(input);
  const combinedText = `${context.toolName} ${extractCommandText(context.toolArgs)}`.trim();
  const allowlist = splitList(process.env.TOOL_GUARD_ALLOWLIST);
  const logFile = path.join(getResolvedLogDir('TOOL_GUARD_LOG_DIR'), 'tool-guardian.log');

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