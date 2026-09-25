import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { writeAtomic } from '../writeAtomic';
import { ACTIONS_VERSION } from './constants';
import type { ActionsFile, StoredAction } from './types';

/** Writes every workspace's actions to `path`. */
export async function writeActions(path: string, actions: readonly StoredAction[]): Promise<void> {
  const file: ActionsFile = { version: ACTIONS_VERSION, actions: [...actions] };
  await mkdir(dirname(path), { recursive: true });
  await writeAtomic(path, `${JSON.stringify(file, null, 2)}\n`);
}
