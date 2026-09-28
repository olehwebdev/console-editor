import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { writeAtomic } from '../writeAtomic';
import { SHOTS_VERSION } from './constants';
import type { ShotsFile, StoredShot } from './types';

/** Writes every workspace's shots' records to `path`. */
export async function writeShots(path: string, shots: readonly StoredShot[]): Promise<void> {
  const file: ShotsFile = { version: SHOTS_VERSION, shots: [...shots] };
  await mkdir(dirname(path), { recursive: true });
  await writeAtomic(path, `${JSON.stringify(file, null, 2)}\n`);
}
