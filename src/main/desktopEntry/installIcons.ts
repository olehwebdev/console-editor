import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ICON_EXTENSION, ICON_FILE, ICON_NAME, XDG } from './constants';
import { markThemeChanged } from './markThemeChanged';
import { writeIfChanged } from './writeIfChanged';

/**
 * Copies the bundled icons into the user's hicolor theme, one per size, named after the app, and marks the theme
 * changed when any of them did (the first run, or an update that brings a new icon).
 */
export async function installIcons(bundled: string, dataHome: string): Promise<void> {
  const theme = join(dataHome, XDG.iconTheme);
  const sizes = (await readdir(bundled)).filter((name) => ICON_FILE.test(name));
  const written = await Promise.all(
    sizes.map(async (name) =>
      writeIfChanged(join(theme, basename(name, ICON_EXTENSION), XDG.iconContext, ICON_NAME), await readFile(join(bundled, name))),
    ),
  );
  if (written.some(Boolean)) await markThemeChanged(theme);
}
