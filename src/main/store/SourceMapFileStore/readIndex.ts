import { readFile } from 'node:fs/promises';
import { isStoredMapFile } from './isStoredMapFile';
import type { StoredMapFile } from './types';

/** The index as written, entries that don't hold up left out; empty when there is none yet. */
export async function readIndex(path: string): Promise<StoredMapFile[]> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return [];
  }
  return (Array.isArray(raw) ? raw : []).filter(isStoredMapFile);
}
