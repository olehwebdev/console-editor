import { MAX_BREAKPOINTS, validateBreakpoint } from '@common/breakpoints';
import type { Breakpoint } from '@common/types';
import { toast } from '@/shared/ui/toast';
import { BREAKPOINT_ID_PREFIX, type BreakpointInput } from './constants';
import { setBreakpoints } from './setBreakpoints';
import { currentBreakpoints } from './currentBreakpoints';

/** Adds a breakpoint to the shown workspace, on. False, with the reason said, when it can't be. */
export function addBreakpoint(input: BreakpointInput): boolean {
  const breakpoint: Breakpoint = { ...input, id: `${BREAKPOINT_ID_PREFIX}${crypto.randomUUID()}`, enabled: true };
  const problem = validateBreakpoint(breakpoint) ?? (currentBreakpoints().length >= MAX_BREAKPOINTS ? `A workspace keeps up to ${MAX_BREAKPOINTS} breakpoints` : null);
  if (problem) {
    toast({ title: 'Could not add the breakpoint', description: problem, tone: 'warning' });
    return false;
  }
  void setBreakpoints((list) => [...list, breakpoint]);
  return true;
}
