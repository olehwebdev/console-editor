import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type LayoutModule = typeof import('@/pages/editor/model/layout');

const KEY = 'console-editor:layout';
const RAIL = 48;
let storage: Map<string, string>;
let setItem: ReturnType<typeof vi.fn>;

/** A fresh store module, loaded against `saved` storage and a window `width` px wide. */
async function loadLayout(width = 1600, saved?: Record<string, unknown>): Promise<LayoutModule> {
  storage = new Map(saved ? [[KEY, JSON.stringify(saved)]] : []);
  setItem = vi.fn((key: string, value: string) => void storage.set(key, value));
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem });
  vi.stubGlobal('window', { innerWidth: width, addEventListener: vi.fn() });
  vi.resetModules();
  return import('@/pages/editor/model/layout');
}

const stored = () => JSON.parse(storage.get(KEY) ?? 'null');

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('layout persistence', () => {
  it('remembers sidebar and preview toggles without any resize, and restores them', async () => {
    const { useLayout } = await loadLayout();
    useLayout.getState().togglePreview();
    useLayout.getState().showSidebarView('settings');
    expect(setItem).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(stored()).toEqual({ sidebar: 'settings', sidebarWidth: 290, previewVisible: false, previewRatio: 0.42, consoleVisible: false, consoleHeight: 240, bottomView: 'console' });

    const { useLayout: reloaded } = await loadLayout(1600, stored());
    expect(reloaded.getState()).toMatchObject({ sidebar: 'settings', previewVisible: false, resizing: false });
  });

  it('writes a drag once, when it ends, never per frame', async () => {
    const { useLayout } = await loadLayout();
    const layout = useLayout.getState();
    layout.setResizing(true);
    for (let i = 1; i <= 20; i++) layout.resizeSidebar(5, 5 * i);
    vi.runAllTimers();
    expect(setItem).not.toHaveBeenCalled();
    layout.setResizing(false);
    vi.runAllTimers();
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(stored().sidebarWidth).toBe(390);
  });

  it('persists keyboard steps (no drag start) and debounces a burst into one write', async () => {
    const { useLayout } = await loadLayout();
    const layout = useLayout.getState();
    for (let i = 0; i < 4; i++) {
      layout.resizeSidebar(16, 16);
      layout.setResizing(false); // the resizer's onResizeEnd after each key step
    }
    vi.runAllTimers();
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(stored().sidebarWidth).toBe(354);
  });

  it('does not write for window resizes or changes that cancel out', async () => {
    const { useLayout } = await loadLayout();
    useLayout.getState().setRowWidth(1200);
    useLayout.getState().togglePreview();
    useLayout.getState().togglePreview();
    vi.runAllTimers();
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('the bottom pane', () => {
  it('shows the console or the network panel; its toggle brings back the last one shown', async () => {
    const { useLayout } = await loadLayout();
    expect(useLayout.getState()).toMatchObject({ consoleVisible: false, bottomView: 'console' });
    useLayout.getState().showBottomView('network');
    expect(useLayout.getState()).toMatchObject({ consoleVisible: true, bottomView: 'network' });
    // Showing what already shows changes nothing (never hides it).
    const before = useLayout.getState();
    useLayout.getState().showBottomView('network');
    expect(useLayout.getState()).toBe(before);
    useLayout.getState().toggleConsole();
    useLayout.getState().toggleConsole();
    expect(useLayout.getState()).toMatchObject({ consoleVisible: true, bottomView: 'network' });
    vi.runAllTimers();
    expect(stored()).toMatchObject({ consoleVisible: true, bottomView: 'network' });
  });

  it("falls back to the console for a view it doesn't know (saved by a later version)", async () => {
    const { useLayout } = await loadLayout(1600, { consoleVisible: true, bottomView: 'profiler' });
    expect(useLayout.getState()).toMatchObject({ consoleVisible: true, bottomView: 'console' });
  });
});

describe('panel fitting', () => {
  it('keeps the editor at least EDITOR_MIN_W wide and the row from overflowing, whatever is stored', async () => {
    const { fitPanels, EDITOR_MIN_W } = await loadLayout();
    // Below 960 px: a zoomed-in window (960 px at 150% is a 640 px row, at 300% a 320 px one).
    for (const rowWidth of [200, 320, 480, 560, 640, 651, 700, 800, 960, 1100, 1280, 1600, 2560]) {
      for (const sidebarWidth of [120, 220, 290, 520]) {
        for (const previewRatio of [0.1, 0.22, 0.42, 0.72]) {
          for (const sidebar of ['explorer', null] as const) {
            for (const previewVisible of [true, false]) {
              const w = fitPanels({ sidebar, sidebarWidth, previewVisible, previewRatio, rowWidth });
              const editor = rowWidth - RAIL - (sidebar ? w.sidebar : 0) - w.preview;
              const at = JSON.stringify({ rowWidth, sidebarWidth, previewRatio, sidebar, previewVisible });
              expect(editor, at).toBeGreaterThanOrEqual(Math.min(EDITOR_MIN_W, rowWidth - RAIL));
              expect(Math.min(w.sidebar, w.preview), at).toBeGreaterThanOrEqual(0);
              expect(Number.isInteger(w.sidebar) && Number.isInteger(w.preview), at).toBe(true);
            }
          }
        }
      }
    }
  });

  it('lets both minimums give way in proportion when the row is too narrow for them beside the editor', async () => {
    const { fitPanels } = await loadLayout();
    const prefs = { sidebar: 'explorer' as const, sidebarWidth: 290, previewVisible: true, previewRatio: 0.42 };
    // 651 px is about the narrowest row that fits 220 + 22% beside the editor.
    expect(fitPanels({ ...prefs, sidebarWidth: 220, previewRatio: 0.22, rowWidth: 660 })).toEqual({ sidebar: 220, preview: 145 });
    // 640 px (960 px at 150%): 352 px of room for 220 + 140.8; the two fill it.
    expect(fitPanels({ ...prefs, rowWidth: 640 })).toEqual({ sidebar: 214, preview: 138 });
    // 480 px (200%): 192 px of room.
    expect(fitPanels({ ...prefs, rowWidth: 480 })).toEqual({ sidebar: 129, preview: 63 });
    // With the sidebar hidden the preview only needs its own minimum.
    expect(fitPanels({ ...prefs, sidebar: null, rowWidth: 480 }).preview).toBe(192);
  });

  it('shrinks the preview first, then the sidebar, and brings the preferences back on a wider row', async () => {
    const { fitPanels } = await loadLayout();
    const prefs = { sidebar: 'explorer' as const, sidebarWidth: 290, previewVisible: true, previewRatio: 0.72 };
    // The reviewed failure: 48 + 290 + 0.72 * 960 = 1029 px in a 960 px window.
    expect(fitPanels({ ...prefs, rowWidth: 960 })).toEqual({ sidebar: 290, preview: 382 });
    // With the sidebar hidden the preview gets the room back (up to its own maximum).
    expect(fitPanels({ ...prefs, sidebar: null, rowWidth: 960 })).toEqual({ sidebar: 290, preview: 672 });
    // A preview already at its minimum: the sidebar gives way.
    expect(fitPanels({ ...prefs, sidebarWidth: 520, previewRatio: 0.22, rowWidth: 960 })).toEqual({ sidebar: 460, preview: 211 });
    expect(fitPanels({ ...prefs, rowWidth: 2560 })).toEqual({ sidebar: 290, preview: 1843 });
  });

  it('stops a dragged panel at the other one instead of squeezing the editor', async () => {
    const { useLayout, fitPanels, EDITOR_MIN_W } = await loadLayout(1280);
    const layout = useLayout.getState();
    layout.resizeSidebar(1000, 1000);
    let state = useLayout.getState();
    expect(state.sidebarWidth).toBe(1280 - RAIL - EDITOR_MIN_W - fitPanels(state).preview);

    layout.resizeSidebar(-1000, -1000);
    layout.resizePreview(-1000, -1000); // leftwards = wider
    state = useLayout.getState();
    expect(state.sidebarWidth).toBe(220);
    expect(fitPanels(state).preview).toBe(1280 - RAIL - EDITOR_MIN_W - 220);
    expect(state.previewRatio).toBeCloseTo((1280 - RAIL - EDITOR_MIN_W - 220) / 1280);

    layout.resizePreview(1000, 1000);
    expect(useLayout.getState().previewRatio).toBeCloseTo(0.22);
  });

  it('starts a drag from the fitted width, not an oversized stored one', async () => {
    const { useLayout, fitPanels } = await loadLayout(960, { sidebarWidth: 290, previewRatio: 0.72 });
    const before = fitPanels(useLayout.getState()).preview;
    useLayout.getState().resizePreview(10, 10);
    expect(fitPanels(useLayout.getState()).preview).toBe(before - 10);

    useLayout.getState().setResizing(true);
    useLayout.getState().resizePreview(4, 4);
    expect(fitPanels(useLayout.getState()).preview).toBe(before - 14);
  });

  it('holds the settled preview width through a drag, then catches up', async () => {
    const { useLayout, selectPreviewWidth, selectSettledPreviewWidth } = await loadLayout(1600);
    const width = () => selectPreviewWidth(useLayout.getState());
    const settled = () => selectSettledPreviewWidth(useLayout.getState());
    const before = width();
    expect(settled()).toBe(before);

    useLayout.getState().setResizing(true);
    useLayout.getState().resizePreview(-60, -60);
    useLayout.getState().resizePreview(-60, -120);
    expect(width()).toBe(before + 120);
    expect(settled()).toBe(before);

    useLayout.getState().setResizing(false);
    expect(settled()).toBe(before + 120);
  });

  it('keeps the dividers under the pointer through sub-pixel moves (scaled screens, zoom)', async () => {
    const { useLayout, selectPreviewWidth, selectSidebarWidth } = await loadLayout(1600);
    const width = { preview: () => selectPreviewWidth(useLayout.getState()), sidebar: () => selectSidebarWidth(useLayout.getState()) };
    /** One pointer drag on `panel`'s divider in `steps` equal moves. */
    const drag = (panel: 'preview' | 'sidebar', step: number, steps: number) => {
      const resize = panel === 'preview' ? useLayout.getState().resizePreview : useLayout.getState().resizeSidebar;
      useLayout.getState().setResizing(true);
      for (let i = 1; i <= steps; i++) resize(step, step * i);
      useLayout.getState().setResizing(false);
    };
    for (const panel of ['preview', 'sidebar'] as const) {
      const sign = panel === 'preview' ? -1 : 1; // the preview's divider is its left edge
      for (const [step, steps] of [
        [0.5, 60],
        [-0.5, 60],
        [0.8, 60],
        [-0.25, 81],
      ]) {
        const before = width[panel]();
        drag(panel, step, steps);
        // Whole-pixel widths: within half a pixel of where the pointer is.
        expect(Math.abs(width[panel]() - before - sign * step * steps), `${panel} ${step} x ${steps}`).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('holds a divider at its limit until the pointer comes back to it', async () => {
    const { useLayout, selectSidebarWidth } = await loadLayout(1600);
    const layout = useLayout.getState();
    layout.setResizing(true);
    layout.resizeSidebar(-200, -200); // 290 → 90 asked, held at 220
    expect(selectSidebarWidth(useLayout.getState())).toBe(220);
    layout.resizeSidebar(100, -100); // the pointer is still 30 px left of the divider
    expect(selectSidebarWidth(useLayout.getState())).toBe(220);
    layout.resizeSidebar(80, -20);
    expect(selectSidebarWidth(useLayout.getState())).toBe(270);
  });
});

describe('hiding the sidebar', () => {
  it('keeps its room from the preview until it has animated out, so the row never overflows', async () => {
    const { useLayout, selectPreviewWidth } = await loadLayout(960, { sidebarWidth: 290, previewRatio: 0.72 });
    const preview = () => selectPreviewWidth(useLayout.getState());
    expect(preview()).toBe(382);
    useLayout.getState().toggleSidebar();
    expect(useLayout.getState().sidebar).toBeNull();
    expect(preview()).toBe(382); // while the 290 px sidebar collapses
    useLayout.getState().sidebarExited();
    expect(preview()).toBe(672);

    // Shown again mid-exit (no exit completes), then hidden again.
    useLayout.getState().toggleSidebar();
    useLayout.getState().toggleSidebar();
    useLayout.getState().toggleSidebar();
    expect(preview()).toBe(382);
    useLayout.getState().toggleSidebar();
    expect(preview()).toBe(382);
    useLayout.getState().sidebarExited();
    expect(preview()).toBe(672);
  });
});
