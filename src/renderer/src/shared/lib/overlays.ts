import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * The website is a native view drawn above the renderer, so HTML overlays that
 * overlap it (palette, menus, dialogs) would be hidden behind it. Overlays
 * register while open; the page preview swaps the live view for a still
 * snapshot whenever at least one is open.
 */
interface OverlayStore {
  open: number;
  change(delta: 1 | -1): void;
}

export const useOverlayStore = create<OverlayStore>()((set) => ({
  open: 0,
  change: (delta) => set((s) => ({ open: Math.max(0, s.open + delta) })),
}));

/** Call from any overlay component with its `open` state. */
export function useRegisterOverlay(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    useOverlayStore.getState().change(1);
    return () => useOverlayStore.getState().change(-1);
  }, [open]);
}

export const selectAnyOverlayOpen = (s: OverlayStore) => s.open > 0;
