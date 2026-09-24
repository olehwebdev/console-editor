import { create } from 'zustand';
import type { SidebarView } from '@/widgets/activity-bar';

/** The activity rail (`--rail-w`). */
const RAIL_W = 48;
/** The editor column never gets narrower than this, so its tabs, header and Save stay usable. */
export const EDITOR_MIN_W = 240;
const SIDEBAR_W = { min: 220, max: 520 };
const PREVIEW_RATIO = { min: 0.22, max: 0.72 };

/** What is remembered between runs. */
interface SavedLayout {
  sidebar: SidebarView | null;
  /** Preferred width; `fitPanels` gives what the row has room for. */
  sidebarWidth: number;
  previewVisible: boolean;
  /** Preferred share of the row's width taken by the website preview. */
  previewRatio: number;
}

interface Layout extends SavedLayout {
  /** Width of the workspace row (rail, sidebar, editor, preview); kept current by the page. */
  rowWidth: number;
  /** Hidden but still animating out: its room isn't the preview's yet (the row would overflow). */
  sidebarLeaving: boolean;
  resizing: boolean;
  /** Fitted widths when the current drag started. */
  dragStart: PanelWidths | null;
}

interface LayoutStore extends Layout {
  setSidebar(view: SidebarView | null): void;
  toggleSidebar(): void;
  showSidebarView(view: SidebarView): void;
  /** The hidden sidebar finished animating out. */
  sidebarExited(): void;
  togglePreview(): void;
  /**
   * A PanelResizer step (its `onResize`): a drag applies its total travel to
   * the width it started from, so rounding and limits never make the divider
   * drift from the pointer; a key step moves by `deltaPx`. Stops where the
   * other panel or the editor's minimum width begins.
   */
  resizeSidebar(deltaPx: number, totalPx: number): void;
  /** The same on the preview's left edge (+ = narrower). */
  resizePreview(deltaPx: number, totalPx: number): void;
  setRowWidth(width: number): void;
  setResizing(resizing: boolean): void;
}

export interface PanelWidths {
  /** The sidebar's width while shown (also while it animates in or out). */
  sidebar: number;
  /** The preview's width; 0 when hidden. */
  preview: number;
}

type FitInput = Pick<Layout, 'sidebar' | 'sidebarWidth' | 'previewVisible' | 'previewRatio' | 'rowWidth'> & Partial<Pick<Layout, 'sidebarLeaving'>>;

/** `max` wins if the bounds cross, so a fitted panel never overflows its room. */
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The sidebar takes room in the row: shown, or still animating out. */
const sidebarInRow = (l: FitInput) => !!l.sidebar || !!l.sidebarLeaving;

/** The room beside the editor's minimum width, and the panel minimums within it. */
function limits(l: FitInput) {
  const room = Math.max(0, l.rowWidth - RAIL_W - EDITOR_MIN_W);
  const sidebarMin = sidebarInRow(l) ? SIDEBAR_W.min : 0;
  const previewMin = l.previewVisible ? PREVIEW_RATIO.min * l.rowWidth : 0;
  // A row too narrow for both beside the editor (a small or zoomed-in window): the minimums give way in proportion.
  const scale = Math.min(1, room / (sidebarMin + previewMin || 1));
  return { room, sidebarMin: sidebarMin * scale, previewMin: previewMin * scale };
}

/**
 * The panel widths the row has room for, leaving the editor at least
 * EDITOR_MIN_W: the preview gives way first, then the sidebar. The
 * preferences are kept, so a wider window brings them back.
 */
export function fitPanels(l: FitInput): PanelWidths {
  const { room, sidebarMin, previewMin } = limits(l);
  // Whole pixels under whole-pixel upper bounds, so the two never add up to more than the room.
  const sidebar = Math.round(clamp(l.sidebarWidth, sidebarMin, Math.min(SIDEBAR_W.max, Math.floor(room - previewMin))));
  const previewMax = Math.min(PREVIEW_RATIO.max * l.rowWidth, room - (sidebarInRow(l) ? sidebar : 0));
  const preview = l.previewVisible ? Math.round(clamp(l.previewRatio * l.rowWidth, previewMin, previewMax)) : 0;
  return { sidebar, preview };
}

const KEY = 'console-editor:layout';
const DEFAULTS: SavedLayout = { sidebar: 'explorer', sidebarWidth: 290, previewVisible: true, previewRatio: 0.42 };

function load(): SavedLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<SavedLayout>;
    const { sidebar, sidebarWidth, previewVisible, previewRatio } = { ...DEFAULTS, ...saved };
    return { sidebar, sidebarWidth, previewVisible, previewRatio };
  } catch {
    return DEFAULTS;
  }
}

/** Shows `sidebar` (null hides it); a hidden one keeps its room until `sidebarExited`. */
const withSidebar = (s: Layout, sidebar: SidebarView | null) => ({ sidebar, sidebarLeaving: !sidebar && (s.sidebarLeaving || !!s.sidebar) });

/** Workspace layout (per-viewer convenience, remembered in localStorage). */
export const useLayout = create<LayoutStore>()((set) => ({
  ...load(),
  rowWidth: window.innerWidth,
  sidebarLeaving: false,
  resizing: false,
  dragStart: null,
  setSidebar: (view) => set((s) => withSidebar(s, view)),
  toggleSidebar: () => set((s) => withSidebar(s, s.sidebar ? null : 'explorer')),
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

export const selectSidebarWidth = (s: Layout) => fitPanels(s).sidebar;
export const selectPreviewWidth = (s: Layout) => fitPanels(s).preview;
/** The preview's width, held at where it was while a panel is dragged. */
export const selectSettledPreviewWidth = (s: Layout) => s.dragStart?.preview ?? fitPanels(s).preview;

const serialize = ({ sidebar, sidebarWidth, previewVisible, previewRatio }: SavedLayout) =>
  JSON.stringify({ sidebar, sidebarWidth, previewVisible, previewRatio });

const SAVE_DELAY = 250;
let lastSaved = serialize(useLayout.getState());
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function save(): void {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  const state = useLayout.getState();
  const json = serialize(state);
  if (state.resizing || json === lastSaved) return;
  try {
    localStorage.setItem(KEY, json);
    lastSaved = json;
  } catch {
    // Not persisted; fine.
  }
}

// Every committed change is remembered (debounced); a drag only once it ends.
useLayout.subscribe((state) => {
  if (state.resizing || serialize(state) === lastSaved) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, SAVE_DELAY);
});
window.addEventListener('pagehide', save);
