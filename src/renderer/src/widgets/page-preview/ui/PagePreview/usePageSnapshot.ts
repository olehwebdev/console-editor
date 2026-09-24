import { useEffect, useState } from 'react';
import { api } from '@/shared/api';
import { CAPTURE_FAILED } from './constants';
import type { Snapshot } from './types';

/** The still that stands in for the page while `frozen`; null while it's being captured, and whenever not frozen. */
export function usePageSnapshot(frozen: boolean): Snapshot {
  const [snapshot, setSnapshot] = useState<Snapshot>(null);
  // A still belongs to one freeze; the next one waits for its own.
  if (!frozen && snapshot !== null) setSnapshot(null);

  // Freeze: capture first (the live view keeps showing meanwhile), then swap in the still.
  useEffect(() => {
    if (!frozen) return;
    let cancelled = false;
    void api
      .capturePage()
      .catch(() => null)
      .then((image) => {
        if (!cancelled) setSnapshot(image ?? CAPTURE_FAILED);
      });
    return () => {
      cancelled = true;
    };
  }, [frozen]);

  return snapshot;
}
