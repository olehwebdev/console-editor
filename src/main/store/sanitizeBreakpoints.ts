import { MAX_BREAKPOINTS, validateBreakpoint } from '../../shared/breakpoints';
import type { Breakpoint } from '../../shared/types';
import { toBreakpoint } from './toBreakpoint';

/** The well-formed breakpoints of a list read from disk (the first of each id, up to the limit), so a corrupt file can't reach the engine. */
export function sanitizeBreakpoints(input: unknown): Breakpoint[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const kept: Breakpoint[] = [];
  for (const candidate of input as Breakpoint[]) {
    if (kept.length >= MAX_BREAKPOINTS) break;
    if (validateBreakpoint(candidate) || seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    kept.push(toBreakpoint(candidate));
  }
  return kept;
}
