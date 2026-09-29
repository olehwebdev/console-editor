import { join } from 'node:path';
import { THUMB_SUFFIX } from './constants';
import type { StoredShot } from './types';

/** Where a shot's image and thumbnail are, in the shots folder `dir`. */
export function shotFiles(dir: string, shot: Pick<StoredShot, 'id' | 'ext'>): { image: string; thumb: string } {
  return { image: join(dir, `${shot.id}.${shot.ext}`), thumb: join(dir, `${shot.id}${THUMB_SUFFIX}`) };
}
