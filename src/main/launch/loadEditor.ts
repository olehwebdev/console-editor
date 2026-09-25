import type { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { ENV, GALLERY_HASH } from '../../shared/constants';
import { galleryMode } from './constants';

/** Where electron-vite puts the editor UI, relative to the main bundle. */
const EDITOR_PAGE = '../renderer/index.html';

/**
 * Loads the editor UI into `win` (or the design-system gallery, or with `hash` another of the UI's views,
 * such as the website's own window): from the dev server when one runs, else from the build.
 */
export async function loadEditor(win: BrowserWindow, hash: string | undefined = galleryMode ? GALLERY_HASH : undefined): Promise<void> {
  const rendererUrl = process.env[ENV.rendererUrl];
  if (rendererUrl) {
    await win.loadURL(`${rendererUrl}${hash ? `#${hash}` : ''}`);
  } else {
    await win.loadFile(join(__dirname, EDITOR_PAGE), { hash });
  }
}
