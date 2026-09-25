import { join } from 'node:path';
import type { SessionFileState } from '../types';
import { writeAtomic } from '../writeAtomic';
import { SESSION_FILE, VERSION } from './constants';

/** Writes `state` to the session file in `dir`, as the current version. */
export function writeSessionFile(dir: string, state: SessionFileState): Promise<void> {
  return writeAtomic(join(dir, SESSION_FILE), `${JSON.stringify({ version: VERSION, ...state }, null, 2)}\n`);
}
