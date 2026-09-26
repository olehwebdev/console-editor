import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { LINTED_EXTENSIONS } from './constants.ts';

/** The first part of a path that leaves the folder it is relative to. */
const PARENT = '..';

/**
 * `path` from `root`, when oxlint should lint it: a script in the project that exists and git doesn't ignore (oxlint
 * lints a file it is handed even if it is built output).
 */
export function lintableFile(root: string, path: string | undefined): string | undefined {
  if (!path) return undefined;
  const file = relative(root, resolve(root, path));
  if (isAbsolute(file) || file.split(sep)[0] === PARENT) return undefined;
  if (!LINTED_EXTENSIONS.includes(extname(file)) || !existsSync(join(root, file))) return undefined;
  const ignored = spawnSync('git', ['check-ignore', '--quiet', file], { cwd: root }).status === 0;
  return ignored ? undefined : file;
}
