import { useMemo } from 'react';
import { frameKey, frameLabels, useFrameStore } from '@/entities/frame';
import { usePageStackStore } from '@/entities/page-stack';
import { useSettingsStore } from '@/entities/settings';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { FrameStackCard } from './FrameStackCard';
import { StackNotRecording } from './StackNotRecording';
import { StackPageHeader } from './StackPageHeader';

/** A workspace with no frame names yet: one shared object, so selecting it never re-renders. */
const NO_NAMES: Readonly<Record<string, string>> = {};

/** What each frame of the page runs: its UI library, framework, state library and bundler, and how each showed. */
export function StackPage() {
  const recording = useSettingsStore((s) => s.settings.captureConsole);
  // Empty while the console doesn't record.
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const stacks = usePageStackStore((s) => s.stacks);
  const labels = useMemo(() => frameLabels(frames, names), [frames, names]);
  const byFrame = useMemo(() => new Map(stacks.map((stack) => [stack.frameId, stack])), [stacks]);

  return (
    <div className="h-full overflow-y-auto bg-surface-editor" data-testid="stack-page">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-8 pb-16 pt-10">
        <StackPageHeader frames={frames.length} />
        {recording ? null : <StackNotRecording />}
        {frames.map((frame) => (
          <FrameStackCard key={frame.id} frame={frame} label={labels.get(frame.id) ?? frameKey(frame)} stack={byFrame.get(frame.id)} />
        ))}
      </div>
    </div>
  );
}
