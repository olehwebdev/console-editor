import { readdir, readFile, utimes } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { LINUX_APP_NAME } from '../appInfo';
import { ICON_EXTENSION, ICON_FILE, XDG } from './constants';
import { writeIfChanged } from './writeIfChanged';

/**
 * Copies the bundled icons into the user's hicolor theme, one per size, named after the app. When any of them
 * changed (the first run, or an update that brings a new icon), the theme folder's time changes too: icon
 * caches (GTK's, and the dock's through it) tell that a theme changed by that time.
 */
export async function installIcons(bundled: string, dataHome: string): Promise<void> {
  const theme = join(dataHome, XDG.iconTheme);
  const sizes = (await readdir(bundled)).filter((name) => ICON_FILE.test(name));
  const written = await Promise.all(
    sizes.map(async (name) =>
      writeIfChanged(
        join(theme, basename(name, ICON_EXTENSION), XDG.iconContext, `${LINUX_APP_NAME}${ICON_EXTENSION}`),
        await readFile(join(bundled, name)),
      ),
    ),
  );
  if (!written.some(Boolean)) return;
  const now = new Date();
  await utimes(theme, now, now);
}
