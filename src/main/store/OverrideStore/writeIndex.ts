import { toIndexEntry } from '../toIndexEntry';
import type { StoredOverride } from '../types';
import { writeAtomic } from '../writeAtomic';
import { INDEX_VERSION } from './constants';
import type { IndexFile } from './types';

/** Writes the index of `overrides` (everything but their content) to `indexPath`. */
export function writeIndex(indexPath: string, overrides: ReadonlyMap<string, StoredOverride>): Promise<void> {
  const index: IndexFile = { version: INDEX_VERSION, overrides: [...overrides.values()].map(toIndexEntry) };
  return writeAtomic(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}
