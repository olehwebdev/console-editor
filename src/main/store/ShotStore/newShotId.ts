import { randomBytes } from 'node:crypto';
import { SHOT_ID_BYTES } from './constants';
import type { StoredShot } from './types';

/** An id no shot of `taken` has. */
export function newShotId(taken: readonly StoredShot[]): string {
  let id: string;
  do id = randomBytes(SHOT_ID_BYTES).toString('hex');
  while (taken.some((s) => s.id === id));
  return id;
}
