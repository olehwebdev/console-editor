import { rm } from 'node:fs/promises';
import { shotFiles } from './shotFiles';
import type { StoredShot } from './types';

/** Removes the files of shots whose records are gone, from the shots folder `dir`; one that can't be removed is left behind (the record is what counts). */
export async function removeShotFiles(dir: string, shots: readonly StoredShot[]): Promise<void> {
  const paths = shots.flatMap((s) => Object.values(shotFiles(dir, s)));
  await Promise.all(paths.map((path) => rm(path, { force: true }).catch(() => undefined)));
}
