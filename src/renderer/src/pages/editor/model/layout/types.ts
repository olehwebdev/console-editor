import type { SidebarView } from '@/widgets/activity-bar';

/** The bottom pane's views: they share its height and its toggle. */
export const BOTTOM_VIEWS = ['console', 'network'] as const;

export type BottomView = (typeof BOTTOM_VIEWS)[number];

/** What is remembered between runs. */
export interface SavedLayout {
  sidebar: SidebarView | null;
  /** Preferred width; `fitPanels` gives what the row has room for. */
  sidebarWidth: number;
  previewVisible: boolean;
  /** Preferred share of the row's width taken by the website preview. */
  previewRatio: number;
  /** Whether the bottom pane (console or network) shows. */
  consoleVisible: boolean;
  /** The bottom pane's height under the editor, in px. */
  consoleHeight: number;
  /** The bottom pane's view: the last one shown, which its toggle brings back. */
  bottomView: BottomView;
}

export interface Layout extends SavedLayout {
  /** Width of the workspace row (rail, sidebar, editor, preview); kept current by the page. */
  rowWidth: number;
  /** Hidden but still animating out: its room isn't the preview's yet (the row would overflow). */
  sidebarLeaving: boolean;
  resizing: boolean;
  /** Fitted widths when the current drag started. */
  dragStart: PanelWidths | null;
  /** The console's height when the current drag of its edge started. */
  consoleDragStart: number | null;
}

export interface LayoutStore extends Layout {
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
  /** Shows or hides the bottom pane, on the view it showed last. */
  toggleConsole(): void;
  /** Shows the bottom pane on this view. */
  showBottomView(view: BottomView): void;
  /** A PanelResizer step on the console's top edge (+ = lower, so shorter), within `CONSOLE_H` and the window. */
  resizeConsole(deltaPx: number, totalPx: number): void;
  /** A drag of the console's edge starts or ends. */
  setConsoleDragging(dragging: boolean): void;
}

export interface PanelWidths {
  /** The sidebar's width while shown (also while it animates in or out). */
  sidebar: number;
  /** The preview's width; 0 when hidden. */
  preview: number;
}

export type FitInput = Pick<Layout, 'sidebar' | 'sidebarWidth' | 'previewVisible' | 'previewRatio' | 'rowWidth'> & Partial<Pick<Layout, 'sidebarLeaving'>>;
