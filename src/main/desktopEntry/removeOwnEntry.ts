import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ENTRY_FILE, ICON_NAME, OWN_ENTRY_MARKER, XDG } from './constants';
import { markThemeChanged } from './markThemeChanged';

/**
 * Removes the desktop entry and icons the app installed for the user, if it did (an entry without its marker is
 * someone else's, and stays). A stale entry would hide the package's own entry, of the same name, from the app
 * grid, and stale icons would stand in front of the package's. Says whether it removed anything.
 */
export async function removeOwnEntry(dataHome: string): Promise<boolean> {
  const entry = join(dataHome, XDG.applications, ENTRY_FILE);
  const text = await readFile(entry, 'utf8').catch(() => '');
  if (!text.split('\n').includes(OWN_ENTRY_MARKER)) return false;
  await rm(entry, { force: true });
  const theme = join(dataHome, XDG.iconTheme);
  const sizes = await readdir(theme).catch(() => []);
  await Promise.all(sizes.map((size) => rm(join(theme, size, XDG.iconContext, ICON_NAME), { force: true })));
  if (sizes.length) await markThemeChanged(theme);
  return true;
}
