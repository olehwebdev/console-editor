import type { ReactNode } from 'react';
import { frameLabels, useFrameStore } from '@/entities/frame';
import { useStoreLog } from '@/entities/inspector';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { ActionRow } from './ActionRow';
import { MAX_SHOWN, NO_NAMES } from './constants';
import { StoresNotice } from './StoresNotice';
import { StoresToolbar } from './StoresToolbar';

export interface StoresPanelProps {
  /** The pane's tabs, in the toolbar's heading place. */
  heading: ReactNode;
  onClose(): void;
}

/**
 * The actions the page's stores handled in every frame, the newest first, while recorded: Redux's, NgRx's
 * and Zustand's (through the Redux DevTools extension's API), Pinia's and Vuex's. Each with what it changed
 * and the app's call that dispatched it.
 */
export function StoresPanel({ heading, onClose }: StoresPanelProps) {
  const actions = useStoreLog((s) => s.actions);
  const recording = useStoreLog((s) => s.recording);
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const labels = frameLabels(frames, names);
  const shown = actions.slice(-MAX_SHOWN).reverse();
  return (
    <section aria-label="Stores" data-testid="stores-panel" className="flex h-full min-h-0 flex-col bg-surface-editor">
      <StoresToolbar heading={heading} onClose={onClose} />
      <StoresNotice />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {shown.map((action) => (
          <ActionRow key={action.id} action={action} frame={frames.find((f) => f.id === action.frameId)} label={action.frameId ? labels.get(action.frameId) : undefined} />
        ))}
        {shown.length ? null : (
          <p className="px-3 py-2 text-[12px] text-fg-subtle">
            {recording
              ? "Recording. Use the page: each action its stores handle shows here, with what it changed and the code that dispatched it."
              : 'Record to see the actions of the page\'s stores (Redux, NgRx, Zustand, Pinia, Vuex) in every frame: what each changed, and where it was dispatched.'}
          </p>
        )}
      </div>
    </section>
  );
}
