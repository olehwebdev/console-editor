import { create } from 'zustand';
import type { SidebarView } from '@/widgets/activity-bar';

interface Layout {
  sidebar: SidebarView | null;
  sidebarWidth: number;
  previewVisible: boolean;
  /** Share of the window's width taken by the website preview. */
  previewRatio: number;
  resizing: boolean;
}

interface LayoutStore extends Layout {
  setSidebar(view: SidebarView | null): void;
  toggleSidebar(): void;
  showSidebarView(view: SidebarView): void;
  togglePreview(): void;
  setSidebarWidth(width: number): void;
  setPreviewRatio(ratio: number): void;
  setResizing(resizing: boolean): void;
}

const KEY = 'console-editor:layout';
const DEFAULTS: Layout = { sidebar: 'explorer', sidebarWidth: 290, previewVisible: true, previewRatio: 0.42, resizing: false };

function load(): Layout {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Layout>;
    return { ...DEFAULTS, ...saved, resizing: false };
  } catch {
    return DEFAULTS;
  }
}

/** Workspace layout (per-viewer convenience, remembered in localStorage). */
export const useLayout = create<LayoutStore>()((set, get) => ({
  ...load(),
  setSidebar: (sidebar) => set({ sidebar }),
  toggleSidebar: () => set((s) => ({ sidebar: s.sidebar ? null : 'explorer' })),
  showSidebarView: (view) => set((s) => ({ sidebar: s.sidebar === view ? null : view })),
  togglePreview: () => set((s) => ({ previewVisible: !s.previewVisible })),
  setSidebarWidth: (width) => set({ sidebarWidth: Math.round(Math.min(Math.max(width, 220), 520)) }),
  setPreviewRatio: (ratio) => set({ previewRatio: Math.min(Math.max(ratio, 0.22), 0.72) }),
  setResizing: (resizing) => {
    set({ resizing });
    if (!resizing) {
      const { sidebar, sidebarWidth, previewVisible, previewRatio } = get();
      try {
        localStorage.setItem(KEY, JSON.stringify({ sidebar, sidebarWidth, previewVisible, previewRatio }));
      } catch {
        // Not persisted; fine.
      }
    }
  },
}));
