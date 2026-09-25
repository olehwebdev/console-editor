import { setBreakpoints } from './setBreakpoints';

/** Removes a breakpoint. A request it holds stays held until it is let go. */
export function removeBreakpoint(id: string): Promise<void> {
  return setBreakpoints((list) => list.filter((b) => b.id !== id));
}
