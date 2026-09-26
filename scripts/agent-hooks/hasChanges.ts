import { execFileSync } from 'node:child_process';

/** Whether the working tree differs from HEAD: changed, staged or new files that git doesn't ignore. */
export function hasChanges(root: string): boolean {
  return execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim() !== '';
}
