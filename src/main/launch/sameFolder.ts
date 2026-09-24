import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

/** Whether two paths name the same folder (following links; case-insensitive where the file system usually is). */
export function sameFolder(a: string, b: string): boolean {
  const canonical = (path: string) => {
    let real: string;
    try {
      real = realpathSync.native(path);
    } catch {
      real = resolve(path);
    }
    return process.platform === 'linux' ? real : real.toLowerCase();
  };
  return canonical(a) === canonical(b);
}
