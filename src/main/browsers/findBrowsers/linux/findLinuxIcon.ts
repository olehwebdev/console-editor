import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, isAbsolute, join } from 'node:path';
import { ICON_EXTENSIONS, ICON_FOLDERS, ICON_SIZES } from './constants';

/**
 * A launcher's `Icon` as an image file: a path as given, else the name looked up in the fallback icon theme (sizes
 * best first, the user's folders first), then its SVG, then the old pixmaps folder. Null when none is there.
 */
export async function findLinuxIcon(icon: string | undefined, dataDirs: string[]): Promise<string | null> {
  if (!icon) return null;
  const exists = (path: string) =>
    access(path).then(
      () => true,
      () => false,
    );
  if (isAbsolute(icon)) return (await exists(icon)) ? icon : null;
  const name = (ICON_EXTENSIONS as readonly string[]).includes(extname(icon)) ? icon.slice(0, -extname(icon).length) : icon;
  const themes = [join(homedir(), ICON_FOLDERS.userIcons), ...dataDirs.map((dir) => join(dir, ICON_FOLDERS.themes))];
  const candidates = [
    ...ICON_SIZES.flatMap((size) => themes.map((theme) => join(theme, size, ICON_FOLDERS.context, `${name}.png`))),
    ...themes.map((theme) => join(theme, ICON_FOLDERS.scalable, ICON_FOLDERS.context, `${name}.svg`)),
    ...ICON_EXTENSIONS.map((extension) => join(ICON_FOLDERS.pixmaps, `${name}${extension}`)),
  ];
  const found = await Promise.all(candidates.map(exists));
  return candidates[found.indexOf(true)] ?? null;
}
