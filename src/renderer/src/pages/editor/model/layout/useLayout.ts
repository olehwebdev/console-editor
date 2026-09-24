import { create } from 'zustand';
import { clamp } from '@/shared/lib';
import { DEFAULT_SIDEBAR_VIEW, PREVIEW_RATIO, SIDEBAR_W } from './constants';
import { fitPanels } from './fitPanels';
import { limits } from './limits';
import { load } from './load';
import { rememberLayout } from './rememberLayout';
import { sidebarInRow } from './sidebarInRow';
import type { LayoutStore } from './types';
import { withSidebar } from './withSidebar';

/** Workspace layout (per-viewer convenience, remembered in localStorage). */
export const useLayout = create<LayoutStore>()((set) => ({
  ...load(),
  rowWidth: window.innerWidth,
  sidebarLeaving: false,
  resizing: false,
  dragStart: null,
  setSidebar: (view) => set((s) => withSidebar(s, view)),
  toggleSidebar: () => set((s) => withSidebar(s, s.sidebar ? null : DEFAULT_SIDEBAR_VIEW)),
  showSidebarView: (view) => set((s) => withSidebar(s, s.sidebar === view ? null : view)),
  sidebarExited: () => set((s) => (s.sidebarLeaving ? { sidebarLeaving: false } : s)),
  togglePreview: () => set((s) => ({ previewVisible: !s.previewVisible })),
  resizeSidebar: (delta, total) =>
    set((s) => {
      const { room, sidebarMin } = limits(s);
      const { sidebar, preview } = fitPanels(s);
      const target = s.dragStart ? s.dragStart.sidebar + total : sidebar + delta;
      const sidebarWidth = Math.round(clamp(target, sidebarMin, Math.min(SIDEBAR_W.max, room - preview)));
      // Unchanged (held at a limit): no update, so nothing re-renders.
      return sidebarWidth === s.sidebarWidth ? s : { sidebarWidth };
    }),
  resizePreview: (delta, total) =>
    set((s) => {
      if (!s.previewVisible || s.rowWidth <= 0) return s;
      const { room, previewMin } = limits(s);
      const { sidebar, preview } = fitPanels(s);
      const target = s.dragStart ? s.dragStart.preview - total : preview - delta;
      const max = Math.min(PREVIEW_RATIO.max * s.rowWidth, room - (sidebarInRow(s) ? sidebar : 0));
      const previewRatio = clamp(target, previewMin, max) / s.rowWidth;
      return previewRatio === s.previewRatio ? s : { previewRatio };
    }),
  setRowWidth: (rowWidth) => set((s) => (s.rowWidth === rowWidth ? s : { rowWidth })),
  setResizing: (resizing) => set((s) => (s.resizing === resizing ? s : { resizing, dragStart: resizing ? fitPanels(s) : null })),
}));

rememberLayout(useLayout);
