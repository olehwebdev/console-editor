import { MAX_BREAKPOINTS, validateBreakpoint } from '../../shared/breakpoints';
import type { Breakpoint } from '../../shared/types';

/** What is wrong with a workspace's new breakpoints, or null: each is checked, and ids are unique. */
export function breakpointsProblem(breakpoints: Breakpoint[]): string | null {
  if (!Array.isArray(breakpoints)) return 'Breakpoints are a list';
  if (breakpoints.length > MAX_BREAKPOINTS) return `A workspace keeps at most ${MAX_BREAKPOINTS} breakpoints`;
  for (const breakpoint of breakpoints) {
    const problem = validateBreakpoint(breakpoint);
    if (problem) return problem;
  }
  return new Set(breakpoints.map((b) => b.id)).size === breakpoints.length ? null : 'Two breakpoints have the same id';
}
