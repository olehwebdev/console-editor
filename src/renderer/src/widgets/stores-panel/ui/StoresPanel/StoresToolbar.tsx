import type { ReactNode } from 'react';
import { RecordingToolbar, useStoreLog } from '@/entities/inspector';
import { clearStores, recordStores } from '@/features/inspect/stores';

/** The Stores log's header: the pane's tabs, recording on or off, clearing, and closing the panel. */
export function StoresToolbar({ heading, onClose }: { heading: ReactNode; onClose(): void }) {
  const recording = useStoreLog((s) => s.recording);
  return (
    <RecordingToolbar
      heading={heading}
      recording={recording}
      onRecord={(on) => void recordStores(on)}
      clearLabel="Clear the store actions"
      onClear={clearStores}
      onClose={onClose}
      testIdPrefix="stores"
    />
  );
}
