import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import type { DesignImport } from '../../shared/types';
import { MAX_SHOT_BYTES } from '../store/ShotStore/constants';
import type { PageShots } from './PageShots';

/** Keeps each image file as a design, one at a time; a file that can't be (too large, not an image) is named with why. */
export async function importDesignFiles(shots: PageShots, paths: string[]): Promise<DesignImport> {
  const result: DesignImport = { added: [], failed: [] };
  for (const path of paths) {
    const name = basename(path);
    try {
      if ((await stat(path)).size > MAX_SHOT_BYTES) throw new Error(`Larger than ${MAX_SHOT_BYTES / 1024 / 1024} MB`);
      result.added.push(await shots.addDesign(name, new Uint8Array(await readFile(path))));
    } catch (err) {
      result.failed.push({ name, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  return result;
}
