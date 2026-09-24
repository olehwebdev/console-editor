import type { ConsoleEntry } from '@common/types';
import { entryText } from '@/entities/console-log';
import { LEVEL_FILTERED_SOURCES } from './constants';
import type { ConsoleFilter } from './types';

/** Whether a row shows under the filter; `keyOf` gives the `frameKey` of a row's frame. */
export function matchesFilter(
  entry: ConsoleEntry,
  filter: Pick<ConsoleFilter, 'frameKeys' | 'levels' | 'text'>,
  keyOf: (frameId: string | null) => string | null,
): boolean {
  if (filter.frameKeys.length && !filter.frameKeys.includes(keyOf(entry.frameId) ?? '')) return false;
  if (LEVEL_FILTERED_SOURCES.has(entry.source) && !filter.levels[entry.level]) return false;
  const text = filter.text.trim().toLowerCase();
  if (!text) return true;
  return entryText(entry).toLowerCase().includes(text) || !!entry.location?.url.toLowerCase().includes(text);
}
