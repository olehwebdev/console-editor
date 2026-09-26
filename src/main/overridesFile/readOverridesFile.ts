import { readFile, stat } from 'node:fs/promises';
import { isRecord } from '../store/isRecord';
import { MAX_IMPORTED_OVERRIDES, MAX_OVERRIDES_FILE_BYTES, OVERRIDES_FILE_FORMAT, OVERRIDES_FILE_VERSION } from './constants';
import type { OverridesFileEntries } from './types';

/** An export file's overrides and rules, as found. Throws for a file too big, not JSON, not an export, or made by a newer version. */
export async function readOverridesFile(path: string): Promise<OverridesFileEntries> {
  if ((await stat(path)).size > MAX_OVERRIDES_FILE_BYTES) throw new Error(`That file is over ${MAX_OVERRIDES_FILE_BYTES / 1024 / 1024} MB`);
  let file: unknown;
  try {
    file = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new Error("That file isn't JSON, so it isn't an export of overrides");
  }
  if (!isRecord(file) || file.format !== OVERRIDES_FILE_FORMAT) throw new Error("That file isn't an export of Console Editor's overrides");
  if (typeof file.version !== 'number' || file.version > OVERRIDES_FILE_VERSION) throw new Error('A newer version of Console Editor made that file: update the app to import it');
  const overrides = Array.isArray(file.overrides) ? file.overrides : [];
  if (overrides.length > MAX_IMPORTED_OVERRIDES) throw new Error(`That file lists over ${MAX_IMPORTED_OVERRIDES} overrides`);
  return { overrides, rules: Array.isArray(file.rules) ? file.rules : [] };
}
