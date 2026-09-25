import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AppInfo } from '../../../shared/types';
import { FILE_NOT_FOUND } from '../../constants';
import type { UpdateServiceOptions } from './types';

/** The running version, and the one before it when the app was just updated; records the running one for next time. */
export async function readAppInfo({ currentVersion: version, stateFile, unrecordedVersion }: UpdateServiceOptions): Promise<AppInfo> {
  let last: unknown = null;
  try {
    last = (JSON.parse(await readFile(stateFile, 'utf8')) as { lastVersion?: unknown }).lastVersion;
  } catch (err) {
    // No record yet: an update from a version that kept none, or a first run. An unreadable one: not an update.
    if ((err as NodeJS.ErrnoException).code === FILE_NOT_FOUND) last = unrecordedVersion;
  }
  if (last !== version) {
    await mkdir(dirname(stateFile), { recursive: true });
    await writeFile(stateFile, `${JSON.stringify({ lastVersion: version })}\n`).catch(() => undefined);
  }
  return { version, updatedFrom: typeof last === 'string' && last !== version ? last : null };
}
