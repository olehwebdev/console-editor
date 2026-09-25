import type { Breakpoint } from '@common/types';
import { BreakpointRow } from './BreakpointRow';

/** The workspace's breakpoints, in the order they were added; the first one a request matches stops it. */
export function BreakpointList({ breakpoints }: { breakpoints: readonly Breakpoint[] }) {
  if (!breakpoints.length) {
    return <p className="text-[12px] text-fg-subtle">No breakpoints. A fetch() or XHR a breakpoint matches waits for you, before it is sent or before the page gets its response.</p>;
  }
  return (
    <ul className="flex flex-col" aria-label="Breakpoints" data-testid="breakpoint-list">
      {breakpoints.map((b) => (
        <BreakpointRow key={b.id} breakpoint={b} />
      ))}
    </ul>
  );
}
