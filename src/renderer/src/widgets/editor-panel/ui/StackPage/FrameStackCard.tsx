import type { ConsoleFrame, FrameStack } from '@common/types';
import { FrameChip, frameKey } from '@/entities/frame';
import { CoverageLine } from './CoverageLine';
import { FrameStackBody } from './FrameStackBody';

export interface FrameStackCardProps {
  frame: ConsoleFrame;
  label: string;
  stack: FrameStack | undefined;
}

/** One frame of the page: its chip and address, what it runs, and how many of its scripts have source maps. */
export function FrameStackCard({ frame, label, stack }: FrameStackCardProps) {
  const key = frameKey(frame);
  return (
    <section className="rounded-xl border border-line bg-surface text-[13px]" data-testid="stack-frame" data-frame-key={key}>
      <header className="flex min-w-0 items-center gap-2 border-b border-line px-3.5 py-2.5">
        <FrameChip frameKey={key} label={label} title={frame.url} />
        <span className="truncate font-mono text-[12px] text-fg-muted">{frame.url || 'No document yet'}</span>
      </header>
      <FrameStackBody stack={stack} />
      <CoverageLine coverage={stack?.coverage} />
    </section>
  );
}
