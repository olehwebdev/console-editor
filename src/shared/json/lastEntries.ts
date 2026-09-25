import type { JsonEntry } from './types';

/** An object's members by key; of duplicates, the last (as `JSON.parse` keeps it). */
export function lastEntries(entries: readonly JsonEntry[]): Map<string, JsonEntry> {
  return new Map(entries.map((e) => [e.key, e]));
}
