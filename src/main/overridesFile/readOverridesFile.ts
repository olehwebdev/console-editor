import { readFile, stat } from 'node:fs/promises';
import { overridesFileSchema } from '../../shared/overrides';
import type { OverridesFileEntries } from '../../shared/types';
import { parseInput } from '../store/parseInput';
import { MAX_OVERRIDES_FILE_BYTES } from './constants';

/** An export's overrides and rules, as found. Throws for a file too big, not JSON, not an export, or made by a newer version. */
export async function readOverridesFile(path: string): Promise<OverridesFileEntries> {
  if ((await stat(path)).size > MAX_OVERRIDES_FILE_BYTES) throw new Error(`That file is over ${MAX_OVERRIDES_FILE_BYTES / 1024 / 1024} MB`);
  let file: unknown;
  try {
    file = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new Error("That file isn't JSON, so it isn't an export of overrides");
  }
  return parseInput(overridesFileSchema, file, 'export');
}
