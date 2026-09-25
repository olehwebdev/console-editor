import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { ENTRY_FILE, XDG } from './constants';

/** Whether a package (the .deb or .rpm) installed the app's desktop entry in one of the system's data folders. */
export async function packageEntryExists(dataDirs: string[]): Promise<boolean> {
  const found = await Promise.all(
    dataDirs.map((dir) =>
      access(join(dir, XDG.applications, ENTRY_FILE)).then(
        () => true,
        () => false,
      ),
    ),
  );
  return found.includes(true);
}
