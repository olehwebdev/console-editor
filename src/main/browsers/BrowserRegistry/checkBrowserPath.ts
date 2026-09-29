import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { APP_EXTENSION } from '../findBrowsers/mac/constants';

/** Rejects a path that isn't a program this system can start: an app bundle on macOS, else an executable file. */
export async function checkBrowserPath(path: string): Promise<void> {
  const info = await stat(path).catch(() => null);
  if (!info) throw new Error(`${path} isn't there`);
  if (process.platform === 'darwin' && path.endsWith(APP_EXTENSION) && info.isDirectory()) return;
  if (!info.isFile()) throw new Error(`${path} isn't a program`);
  await access(path, constants.X_OK).catch(() => {
    throw new Error(`${path} can't be run`);
  });
}
