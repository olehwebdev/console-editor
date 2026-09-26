import type { FrameStack } from '@common/types';
import { sortHits } from '@/entities/page-stack';
import { StackHitRow } from './StackHitRow';

/** A frame's findings, or why there are none yet. */
export function FrameStackBody({ stack }: { stack: FrameStack | undefined }) {
  if (!stack) return <p className="px-3.5 py-3 text-fg-subtle">Not looked at yet: a frame is looked at a second after it loads.</p>;
  if (!stack.hits.length) return <p className="px-3.5 py-3 text-fg-subtle">Nothing the page stack knows: plain JavaScript, or a library it doesn't look for.</p>;
  return (
    <div className="flex flex-col py-1.5">
      {sortHits(stack.hits).map((hit) => (
        <StackHitRow key={hit.id} hit={hit} />
      ))}
    </div>
  );
}
