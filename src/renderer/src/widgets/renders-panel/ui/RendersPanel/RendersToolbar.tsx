import type { ReactNode } from 'react';
import { RecordingToolbar, useRenderLog } from '@/entities/inspector';
import { clearRenders, recordRenders } from '@/features/inspect/renders';

/** The Renders log's header: the pane's tabs, recording on or off, clearing, and closing the panel. */
export function RendersToolbar({ heading, onClose }: { heading: ReactNode; onClose(): void }) {
  const recording = useRenderLog((s) => s.recording);
  return (
    <RecordingToolbar
      heading={heading}
      recording={recording}
      onRecord={(on) => void recordRenders(on)}
      clearLabel="Clear the renders"
      onClear={clearRenders}
      onClose={onClose}
      testIdPrefix="renders"
    />
  );
}
