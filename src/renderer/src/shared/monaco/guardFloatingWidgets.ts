import { getNativeViewRect, rectsOverlap, useOverlayStore } from '@/shared/lib';
import type { monaco } from './setup';

/** Monaco's floating layers: hovers, suggestions, parameter hints (fixedOverflowWidgets) and its context menu. */
const LAYERS = '.overflowingContentWidgets, .overflowingOverlayWidgets, .context-view';
const FLOATING = '.overflowingContentWidgets > *, .overflowingOverlayWidgets > *, .context-view';

/**
 * Monaco's floating widgets may reach past the editor into the page preview,
 * where the native page view is drawn over them. While a visible one overlaps
 * the view, this holds an overlay, so the preview swaps the page for a
 * snapshot and the widget shows on top. Returns a disposer.
 */
export function guardFloatingWidgets(host: HTMLElement, editors: monaco.editor.ICodeEditor[]): () => void {
  let holding = false;
  let frame = 0;
  const watched = new WeakSet<Element>();

  const hold = (on: boolean) => {
    if (on === holding) return;
    holding = on;
    useOverlayStore.getState().change(on ? 1 : -1);
  };

  const check = () => {
    frame = 0;
    watchLayers();
    const rect = getNativeViewRect();
    const overlaps =
      !!rect &&
      [...host.querySelectorAll<HTMLElement>(FLOATING)].some((el) => {
        if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false;
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && rectsOverlap(box, rect);
      });
    hold(overlaps);
  };

  const schedule = () => {
    frame ||= requestAnimationFrame(check);
  };

  const observer = new MutationObserver(schedule);
  // Monaco builds (and rebuilds) an editor's layers whenever a model is attached;
  // the context view appears on first use.
  function watchLayers() {
    for (const layer of host.querySelectorAll(LAYERS)) {
      if (watched.has(layer)) continue;
      watched.add(layer);
      observer.observe(layer, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
    }
  }

  watchLayers();
  const listeners = editors.flatMap((editor) => [
    editor.onDidChangeModel(() => {
      watchLayers();
      schedule();
    }),
    editor.onContextMenu(schedule),
  ]);

  return () => {
    observer.disconnect();
    for (const listener of listeners) listener.dispose();
    cancelAnimationFrame(frame);
    hold(false);
  };
}
