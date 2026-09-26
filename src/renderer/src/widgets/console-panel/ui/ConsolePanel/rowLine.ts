import { formatTime } from '@/shared/lib';
import type { ConsoleEntry } from '@common/types';
import { entryText } from '@/entities/console-log';
import type { ResolveFrame } from './types';

/** A row as one line of plain text (Copy): time, frame, level, message and where it came from. */
export function rowLine(entry: ConsoleEntry, resolve: ResolveFrame): string {
  const frame = resolve(entry.frameId)?.label ?? '?';
  const where = entry.location ? ` (${entry.location.url}:${entry.location.line})` : '';
  return `${formatTime(entry.time)} [${frame}] ${entry.level}: ${entryText(entry)}${where}`;
}
