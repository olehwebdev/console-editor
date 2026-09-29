import type { WebContentsView } from 'electron';

/**
 * Lays the page out `width` CSS pixels wide and, when the view is narrower, scales it down to fit (as DevTools'
 * device mode does); `null` gives the page its own size back. Nothing changes while the view has no size (hidden).
 */
export function fitToWidth(view: WebContentsView, width: number | null): void {
  const wc = view.webContents;
  if (width === null) return wc.disableDeviceEmulation();
  const bounds = view.getBounds();
  if (!bounds.width || !bounds.height) return;
  const scale = Math.min(1, bounds.width / width);
  const size = { width, height: Math.round(bounds.height / scale) };
  wc.enableDeviceEmulation({ screenPosition: 'desktop', screenSize: size, viewPosition: { x: 0, y: 0 }, deviceScaleFactor: 0, viewSize: size, scale });
}
