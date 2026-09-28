import { accessSync, constants } from 'node:fs';
import { delimiter, isAbsolute, join } from 'node:path';

/** Whether `name` can be run: an absolute path to an executable file, or a command found on PATH. */
export function programExists(name: string): boolean {
  const runnable = (path: string) => {
    try {
      accessSync(path, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  };
  if (isAbsolute(name)) return runnable(name);
  if (name.includes('/')) return false;
  return (process.env.PATH ?? '').split(delimiter).some((dir) => dir && runnable(join(dir, name)));
}
