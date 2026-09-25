import { setBreakpoints } from './setBreakpoints';

/** Turns a breakpoint on or off. */
export function toggleBreakpoint(id: string): Promise<void> {
  return setBreakpoints((list) => list.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)));
}
