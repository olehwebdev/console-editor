import { create } from 'zustand';
import type { OverlayStore } from './types';

/**
 * The website is a native view drawn above the renderer, so HTML overlays that
 * overlap it (palette, menus, dialogs) would be hidden behind it. Overlays
 * register while open; the page preview swaps the live view for a still
 * snapshot whenever at least one is open.
 */
export const useOverlayStore = create<OverlayStore>()((set) => ({
  open: 0,
  change: (delta) => set((s) => ({ open: Math.max(0, s.open + delta) })),
}));
