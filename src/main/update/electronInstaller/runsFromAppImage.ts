import { realpathSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';

/** Environment variables the AppImage runtime sets. */
const APPIMAGE_ENV = { image: 'APPIMAGE', dir: 'APPDIR' } as const;

/**
 * Whether this process runs from the AppImage that APPIMAGE names. The AppImage runtime sets APPIMAGE and
 * APPDIR (where it mounted or unpacked the image), and programs started from another AppImage (its built-in
 * terminal, say) inherit that one's: updating would then replace another app's file.
 */
export function runsFromAppImage(): boolean {
  const image = process.env[APPIMAGE_ENV.image];
  const appDir = process.env[APPIMAGE_ENV.dir];
  if (!image || !appDir) return false;
  // The runtime builds APPDIR from TMPDIR as given (links, doubled slashes); execPath is the resolved path.
  let dir: string;
  try {
    dir = realpathSync(appDir);
  } catch {
    return false;
  }
  const inside = relative(dir, process.execPath);
  return !!inside && !inside.startsWith('..') && !isAbsolute(inside);
}
