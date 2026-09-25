import type { ReactNode } from 'react';
import { ActionList } from './ActionList';
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
  return (
    <section aria-label="Stores" data-testid="stores-panel" className="flex h-full min-h-0 flex-col bg-surface-editor">
      <StoresToolbar heading={heading} onClose={onClose} />
      <StoresNotice />
      <div className="min-h-0 flex-1">
        <ActionList />
      </div>
    </section>
  );
}
