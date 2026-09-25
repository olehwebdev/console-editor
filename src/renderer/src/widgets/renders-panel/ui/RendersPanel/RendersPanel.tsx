import { useState, type ReactNode } from 'react';
import { PaneTabs } from '@/shared/ui/pane-tabs';
import { useRenderLog } from '@/entities/inspector';
import { CommitList } from './CommitList';
import { RENDERS_VIEWS, type RendersView } from './constants';
import { ProfileView } from './ProfileView';
import { RendersNotice } from './RendersNotice';
import { RendersToolbar } from './RendersToolbar';

export interface RendersPanelProps {
  /** The pane's tabs, in the toolbar's heading place. */
  heading: ReactNode;
  onClose(): void;
}

/**
 * React's commits in every frame, while recorded: the newest first, what each was triggered by, and each
 * component that mounted, rendered (and why: its props, state, a store, a context, its parent) or was
 * skipped; or the same renders by component, with how long each one's took (the profiler's view).
 */
export function RendersPanel({ heading, onClose }: RendersPanelProps) {
  const [view, setView] = useState<RendersView>('commits');
  const commits = useRenderLog((s) => s.commits);
  return (
    <section aria-label="Renders" data-testid="renders-panel" className="flex h-full min-h-0 flex-col bg-surface-editor">
      <RendersToolbar heading={heading} onClose={onClose} />
      <RendersNotice />
      <div className="flex h-7 shrink-0 items-stretch border-b border-line px-2">
        <PaneTabs<RendersView> tabs={RENDERS_VIEWS} value={view} onChange={setView} label="Renders view" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{view === 'commits' ? <CommitList commits={commits} /> : <ProfileView commits={commits} />}</div>
    </section>
  );
}
