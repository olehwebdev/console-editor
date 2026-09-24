import { useEffect } from 'react';
import { useOverlayStore } from './useOverlayStore';

/** Call from any overlay component with its `open` state. */
export function useRegisterOverlay(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    useOverlayStore.getState().change(1);
    return () => useOverlayStore.getState().change(-1);
  }, [open]);
}
