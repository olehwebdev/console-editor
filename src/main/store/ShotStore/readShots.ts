import { readFile } from 'node:fs/promises';
import { SHOTS_VERSION } from './constants';
import { sanitizeStoredShot } from './sanitizeStoredShot';
import type { StoredShot } from './types';

/** The shots in the file at `path`, sanitized, each id once; none when it is missing, corrupt or of a newer version. */
export async function readShots(path: string): Promise<StoredShot[]> {
  let saved: { version?: unknown; shots?: unknown } | null = null;
  try {
    saved = JSON.parse(await readFile(path, 'utf8')) as { version?: unknown; shots?: unknown };
  } catch {
    // Missing (none taken yet) or corrupt: start with none.
  }
  if (saved?.version !== SHOTS_VERSION) return [];
  const shots: StoredShot[] = [];
  for (const input of Array.isArray(saved.shots) ? saved.shots : []) {
    const shot = sanitizeStoredShot(input);
    if (shot && !shots.some((other) => other.id === shot.id)) shots.push(shot);
  }
  return shots;
}
