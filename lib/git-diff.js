import { readFileSync, existsSync, statSync, lstatSync, realpathSync } from 'node:fs';
import { join, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const UNTRACKED_MAX_BYTES = 5 * 1024 * 1024;
const BINARY_PROBE_BYTES = 8192;

/**
 * Count inserted lines for an untracked file, matching `git diff --numstat`
 * semantics (line = `\n`-terminated run; an unterminated trailing run still
 * counts as one line; 0 for empty; 0 for binary; 0 for files > 5MB).
 *
 * `git diff --numstat` (and `--cached --numstat`) do not see untracked files,
 * so the aggregate insertions reported by /api/git-status was blind to them.
 * This helper is used to add that missing slice without shelling out per file.
 *
 * Refuses to read through symlinks or files that resolve outside cwd — git's
 * own `--numstat` does not follow symlinks for untracked paths, so matching
 * that behavior keeps /api/git-status from leaking line counts of files like
 * /etc/passwd if a user happens to have one symlinked into the worktree.
 *
 * @param {string} cwd      repo root
 * @param {string} file     path relative to cwd (no `..`, no absolute)
 * @returns {number} inserted line count; 0 on any error, binary, or size cap
 */
export function countUntrackedLines(cwd, file) {
  if (!file || file.includes('..') || file.startsWith('/')) return 0;
  try {
    const fp = join(cwd, file);
    // Reject when the final component is a symlink (lstat doesn't follow).
    if (lstatSync(fp).isSymbolicLink()) return 0;
    // And when an intermediate symlink moves the real path outside cwd.
    const realCwd = realpathSync(cwd);
    const realFp = realpathSync(fp);
    if (realFp !== realCwd && !realFp.startsWith(realCwd + sep)) return 0;
    const st = statSync(fp);
    if (!st.isFile() || st.size > UNTRACKED_MAX_BYTES) return 0;
    const buf = readFileSync(fp);
    const probe = buf.subarray(0, Math.min(buf.length, BINARY_PROBE_BYTES));
    if (probe.includes(0)) return 0; // binary — numstat also skips
    if (buf.length === 0) return 0;
    let n = 0;
    for (let i = 0; i < buf.length; i++) if (buf[i] === 10) n++;
    if (buf[buf.length - 1] !== 10) n++;
    return n;
  } catch {
    return 0;
  }
}

/**
 * Get git diffs for a list of files.
 * @param {string} cwd - working directory (git repo root)
 * @param {string[]} files - relative file paths
 * @returns {Promise<Array>} diffs array
 */
export async function getGitDiffs(cwd, files) {
  const diffs = [];

  for (const file of files) {
    // 安全检查：防止路径穿越
    if (file.includes('..') || file.startsWith('/')) continue;

    try {
      const { stdout: statusOutput } = await execFileAsync('git', ['status', '--porcelain', '--', file], { cwd, encoding: 'utf-8', timeout: 3000 });
      if (!statusOutput.trim()) continue;

      const status = statusOutput.substring(0, 2).trim();
      const is_new = status === 'A' || status === '??';
      const is_deleted = status === 'D';

      // 检查是否为二进制文件（已删除文件跳过）
      let is_binary = false;
      if (!is_deleted) {
        try {
          const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--numstat', 'HEAD', '--', file], { cwd, encoding: 'utf-8', timeout: 3000 });
          if (diffCheck.includes('-\t-\t')) {
            is_binary = true;
          }
        } catch {}
      }

      let old_content = '';
      let new_content = '';

      if (!is_binary) {
        // 获取旧内容（HEAD 版本）
        if (!is_new) {
          try {
            const { stdout } = await execFileAsync('git', ['show', `HEAD:${file}`], { cwd, encoding: 'utf-8', timeout: 5000, maxBuffer: 5 * 1024 * 1024 });
            old_content = stdout;
          } catch {
            old_content = '';
          }
        }

        // 获取新内容（工作区版本）
        if (!is_deleted) {
          try {
            const filePath = join(cwd, file);
            if (existsSync(filePath)) {
              const stat = statSync(filePath);
              if (stat.size > 5 * 1024 * 1024) {
                // 文件过大
                diffs.push({ file, status, is_large: true, size: stat.size });
                continue;
              }
              new_content = readFileSync(filePath, 'utf-8');
            }
          } catch {
            new_content = '';
          }
        }
      }

      diffs.push({
        file,
        status,
        old_content,
        new_content,
        is_binary,
        is_new,
        is_deleted
      });
    } catch (err) {
      // 跳过无法处理的文件
      continue;
    }
  }

  return diffs;
}
