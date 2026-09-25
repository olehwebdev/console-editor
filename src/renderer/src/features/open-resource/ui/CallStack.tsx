import type { StackFrame } from '@common/types';
import { cn, isLibrarySource } from '@/shared/lib';
import { locationKey, useInspectorStore } from '@/entities/inspector';
import { CodeLink } from './CodeLink';

/**
 * A stack, innermost first (what dispatched a store action, what sent a request): each call's function, its
 * original's name once known, and a link to its code; a library's call (under node_modules) is dimmed.
 */
export function CallStack({ stack, className }: { stack: readonly StackFrame[]; className?: string }) {
  const origins = useInspectorStore((s) => s.origins);
  return (
    <ol className={cn('border-l border-line pl-2', className)} aria-label="Stack" data-testid="call-stack">
      {stack.map((frame, index) => {
        const origin = origins[locationKey(frame)];
        return (
          // A stack never changes or reorders.
          <li key={index} className={cn('flex h-5 min-w-0 items-center gap-3 text-[12px]', origin && isLibrarySource(origin.url) && 'opacity-55')}>
            <span className="min-w-0 flex-1 truncate font-mono text-fg-muted">{origin?.name ?? (frame.name || '(anonymous)')}</span>
            <CodeLink location={frame} />
          </li>
        );
      })}
    </ol>
  );
}
