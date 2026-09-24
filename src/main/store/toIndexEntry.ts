import type { IndexEntry, StoredOverride } from './types';

export function toIndexEntry({ content: _content, ...entry }: StoredOverride): IndexEntry {
  return entry;
}
