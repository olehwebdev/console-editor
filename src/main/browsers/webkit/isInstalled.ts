import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { INSTALLED_MARKER } from './constants';
import type { WebKitBuild } from './types';

/** Whether a build is downloaded whole: its program, and the marker written last. */
export async function isInstalled({ directory, executable }: WebKitBuild): Promise<boolean> {
  return Promise.all([access(join(directory, INSTALLED_MARKER)), access(executable)]).then(
    () => true,
    () => false,
  );
}
