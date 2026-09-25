import type { ReactNode } from 'react';
import { frameLabels, useFrameStore } from '@/entities/frame';
import { useRenderLog } from '@/entities/inspector';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { CommitRow } from './CommitRow';
import { MAX_SHOWN, NO_NAMES } from './constants';
import { RendersNotice } from './RendersNotice';
import { RendersToolbar } from './RendersToolbar';

export interface RendersPanelProps {
  /** The pane's tabs, in the toolbar's heading place. */
  heading: ReactNode;
  onClose(): void;
}

/**
 * React's commits in every frame, the newest first, while recorded: what each
 * was triggered by, and each component that mounted, rendered (and why: its
 * props, state, a store, a context, its parent) or was skipped.
 */
export function RendersPanel({ heading, onClose }: RendersPanelProps) {
  const commits = useRenderLog((s) => s.commits);
  const recording = useRenderLog((s) => s.recording);
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const labels = frameLabels(frames, names);
  const shown = commits.slice(-MAX_SHOWN).reverse();
  return (
    <section aria-label="Renders" data-testid="renders-panel" className="flex h-full min-h-0 flex-col bg-surface-editor">
      <RendersToolbar heading={heading} onClose={onClose} />
      <RendersNotice />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {shown.map((commit) => (
          <CommitRow key={commit.id} commit={commit} frame={frames.find((f) => f.id === commit.frameId)} label={commit.frameId ? labels.get(commit.frameId) : undefined} />
        ))}
        {shown.length ? null : (
          <p className="px-3 py-2 text-[12px] text-fg-subtle">
            {recording
              ? 'Recording. Use the page: each React commit shows here, with why each component rendered.'
              : 'Record to see each React commit in the page and its frames: what triggered it, and why each component rendered.'}
          </p>
        )}
      </div>
    </section>
  );
}
