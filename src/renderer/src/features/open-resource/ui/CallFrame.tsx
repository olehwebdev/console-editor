import type { StackFrame } from '@common/types';
import { cn, isLibrarySource } from '@/shared/lib';
import { useOrigin } from '@/entities/inspector';
import { CodeLink } from './CodeLink';

/** A call of a stack: its function, its original's name once known, and a link to its code; a library's call is dimmed. */
export function CallFrame({ frame }: { frame: StackFrame }) {
  const origin = useOrigin(frame);
  return (
    <li className={cn('flex h-5 min-w-0 items-center gap-3 text-[12px]', origin && isLibrarySource(origin.url) && 'opacity-55')}>
      <span className="min-w-0 flex-1 truncate font-mono text-fg-muted">{origin?.name ?? (frame.name || '(anonymous)')}</span>
      <CodeLink location={frame} />
    </li>
  );
}
