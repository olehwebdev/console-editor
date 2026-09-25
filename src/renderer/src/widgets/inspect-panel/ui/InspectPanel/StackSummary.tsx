import { STACK_LIBRARIES } from '@common/stackLibraries';
import { Button } from '@/shared/ui/button';
import { FrameChip, frameKey, frameLabels, useFrameStore } from '@/entities/frame';
import { usePageStackStore } from '@/entities/page-stack';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { openPageStack } from '@/features/inspect/stack';
import { NO_NAMES } from './constants';

/** Each frame's UI library, from the page stack, and the way to the whole of it. */
export function StackSummary() {
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const stacks = usePageStackStore((s) => s.stacks);
  const labels = frameLabels(frames, names);
  const rows = stacks.flatMap((stack) => {
    const frame = frames.find((f) => f.id === stack.frameId);
    const ui = stack.hits.filter((hit) => STACK_LIBRARIES[hit.id].category === 'ui');
    return frame && ui.length ? [{ frame, text: ui.map((hit) => [STACK_LIBRARIES[hit.id].name, hit.version].filter(Boolean).join(' ')).join(', ') }] : [];
  });
  return (
    <section className="mt-4 flex flex-col gap-1 border-t border-line px-3 pt-3" data-testid="inspect-stack">
      <span className="label-caps px-1 pb-1">Stack</span>
      {rows.map(({ frame, text }) => (
        <div key={frame.id} className="flex h-7 min-w-0 items-center gap-2 px-1 text-[12.5px]">
          <FrameChip frameKey={frameKey(frame)} label={labels.get(frame.id) ?? frameKey(frame)} title={frame.url} />
          <span className="min-w-0 flex-1 truncate text-fg-muted">{text}</span>
        </div>
      ))}
      {rows.length ? null : <span className="px-1 text-[12px] text-fg-subtle">No UI library found in the page's frames.</span>}
      <Button size="sm" variant="ghost" className="self-start" onClick={openPageStack}>
        Open the page stack
      </Button>
    </section>
  );
}
