import { readFile, stat } from 'node:fs/promises';
import { dialog, type BrowserWindow } from 'electron';
import { BYTES_PER_MB, MAP_FILE_FILTERS, SOURCE_MAP_LIMITS } from './constants';

/** Asks for a source map file with the system's dialog, and reads it; null when none was picked. */
export async function pickMapFile(win: BrowserWindow, bundleUrl: string): Promise<{ path: string; bytes: Uint8Array } | null> {
  const picked = await dialog.showOpenDialog(win, { title: `Load a source map for ${bundleUrl}`, filters: MAP_FILE_FILTERS, properties: ['openFile'] });
  const path = picked.canceled ? undefined : picked.filePaths[0];
  if (!path) return null;
  const { size } = await stat(path);
  if (size > SOURCE_MAP_LIMITS.maxMapBytes) throw new Error(`That file is ${Math.ceil(size / BYTES_PER_MB)} MB: a source map is read up to ${SOURCE_MAP_LIMITS.maxMapBytes / BYTES_PER_MB} MB.`);
  return { path, bytes: new Uint8Array(await readFile(path)) };
}
