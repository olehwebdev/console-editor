import type { ConsoleLevel } from '../../../shared/types';
import { CONSOLE_API_LEVEL, ELECTRON_SCRIPT_PREFIX, SKIPPED_API_TYPES, STACK_API_TYPES, type ConsoleApiType } from '../constants';
import { formatArgs } from '../formatArgs';
import { stackOf } from '../stackOf';
import { toLocation } from '../toLocation';
import type { ConsoleApiCalled } from '../types';
import type { RowDraft, ValueOf } from './types';

/** The row of a `console` call (`Runtime.consoleAPICalled`); none for a call that adds none, or Electron's own. */
export function consoleApiRow(p: ConsoleApiCalled, frameId: string | null, value: ValueOf): RowDraft | undefined {
  const top = p.stackTrace?.callFrames[0];
  if (SKIPPED_API_TYPES.has(p.type) || top?.url.startsWith(ELECTRON_SCRIPT_PREFIX)) return undefined;
  // A method newer than this build logs as info.
  const level: ConsoleLevel = Object.hasOwn(CONSOLE_API_LEVEL, p.type) ? CONSOLE_API_LEVEL[p.type as ConsoleApiType] : 'info';
  const stack = STACK_API_TYPES.has(p.type) ? stackOf(p.stackTrace) : undefined;
  return {
    entry: {
      frameId,
      level,
      source: 'console',
      time: p.timestamp,
      ...(top ? { location: toLocation(top) } : {}),
      ...(stack ? { stack } : {}),
    },
    values: (entryId) => (p.args.length ? formatArgs(p.args, (arg) => value(entryId, arg)) : [{ kind: 'string', text: `console.${p.type}()` }]),
  };
}
