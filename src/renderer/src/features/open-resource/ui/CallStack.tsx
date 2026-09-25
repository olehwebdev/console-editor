import type { StackFrame } from '@common/types';
import { cn } from '@/shared/lib';
import { CallFrame } from './CallFrame';

/**
 * A stack, innermost first (what dispatched a store action, what sent a request): each call's function, its
 * original's name once known, and a link to its code; a library's call (under node_modules) is dimmed. Each
 * call re-renders for its own original only.
 */
export function CallStack({ stack, className }: { stack: readonly StackFrame[]; className?: string }) {
  return (
    <ol className={cn('border-l border-line pl-2', className)} aria-label="Stack" data-testid="call-stack">
      {stack.map((frame, index) => (
        // A stack never changes or reorders.
        <CallFrame key={index} frame={frame} />
      ))}
    </ol>
  );
}
