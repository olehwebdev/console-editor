import type { ConsoleLocation } from '@common/types';
import { SourceLink } from './SourceLink';

/** A row's call stack, innermost first, each place opening its file. */
export function StackView({ stack }: { stack: readonly ConsoleLocation[] }) {
  return (
    <ol className="ml-4 flex flex-col text-fg-muted">
      {stack.map((frame, index) => (
        // A stack never reorders; the same place can appear twice (recursion).
        <li key={index} className="flex min-w-0 gap-1.5">
          <span className="shrink-0">at {frame.functionName || '(anonymous)'}</span>
          <SourceLink location={frame} />
        </li>
      ))}
    </ol>
  );
}
