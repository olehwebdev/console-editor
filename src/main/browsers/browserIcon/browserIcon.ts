import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { app, nativeImage } from 'electron';
import { ICON_SIZE, MAX_SVG_ICON_BYTES } from '../constants';
import type { FoundBrowser } from '../types';

const SVG = '.svg';
const SVG_DATA_URL = 'data:image/svg+xml;base64,';

/**
 * A browser's icon as a data URL: its icon file (a PNG scaled to `ICON_SIZE`, an SVG as it is), else what the system
 * shows for its app or program (macOS, Windows); null when there is none.
 */
export async function browserIcon(browser: FoundBrowser): Promise<string | null> {
  try {
    if (browser.iconFile) {
      const bytes = await readFile(browser.iconFile);
      if (extname(browser.iconFile) === SVG) return bytes.length <= MAX_SVG_ICON_BYTES ? `${SVG_DATA_URL}${bytes.toString('base64')}` : null;
      const image = nativeImage.createFromBuffer(bytes);
      return image.isEmpty() ? null : image.resize({ width: ICON_SIZE, height: ICON_SIZE, quality: 'best' }).toDataURL();
    }
    // Linux's answer is the icon of the file's type (a generic program), which says nothing: the menu draws its own.
    if (!browser.app || process.platform === 'linux') return null;
    const image = await app.getFileIcon(browser.app, { size: 'large' });
    return image.isEmpty() ? null : image.toDataURL();
  } catch {
    return null;
  }
}
