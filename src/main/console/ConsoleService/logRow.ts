import { CONSOLE_LEVELS } from '../../../shared/types';
import { stackOf } from '../stackOf';
import type { LogEntryAdded } from '../types';
import { textRow } from './textRow';
import type { RowDraft } from './types';

/** The row of a browser's message (`Log.entryAdded`). */
export function logRow({ entry }: LogEntryAdded, frameId: string | null): RowDraft {
  const level = CONSOLE_LEVELS.find((l) => l === entry.level) ?? 'info';
  const stack = stackOf(entry.stackTrace);
  return textRow(
    {
      frameId,
      level,
      source: 'browser',
      time: entry.timestamp,
      ...(entry.url ? { location: { url: entry.url, line: (entry.lineNumber ?? 0) + 1, column: 1, functionName: '' } } : {}),
      ...(stack ? { stack } : {}),
    },
    entry.text,
  );
}
