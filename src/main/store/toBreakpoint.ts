import type { Breakpoint } from '../../shared/types';

/** A copy of a valid breakpoint with only its own fields, so nothing else rides along into the session file. */
export function toBreakpoint({ id, match, method, stage, enabled }: Breakpoint): Breakpoint {
  return { id, match: { type: match.type, pattern: match.pattern.trim(), ignoreQuery: match.ignoreQuery }, method, stage, enabled };
}
