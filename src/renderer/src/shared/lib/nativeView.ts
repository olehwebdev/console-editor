/** Window-relative CSS-pixel rectangle; the same shape as the page bounds sent to the main process. */
export interface NativeViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/*
 * The website is a native view drawn above the renderer, so anything floating
 * that lands on it is invisible. The page preview reports where the view sits;
 * tooltips (too frequent to freeze the page for) place themselves around it,
 * and editor widgets that can't (Monaco hovers, suggestions) freeze the page
 * while they overlap it.
 */
let nativeViewRect: NativeViewRect | null = null;

/**
 * Where the native page view is placed while a page is shown, including while
 * it is swapped for a snapshot (so a widget that froze the page keeps seeing
 * the overlap). An empty rect or `null` means there is no view to avoid.
 */
export function setNativeViewRect(rect: NativeViewRect | null): void {
  nativeViewRect = rect && rect.width > 0 && rect.height > 0 ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
}

/** The rect floating UI must stay off (or freeze the page over), or null. */
export function getNativeViewRect(): NativeViewRect | null {
  return nativeViewRect;
}

/** True when a DOMRect-like box and the rect share any area. */
export function rectsOverlap(box: { left: number; top: number; right: number; bottom: number }, rect: NativeViewRect): boolean {
  return box.left < rect.x + rect.width && box.right > rect.x && box.top < rect.y + rect.height && box.bottom > rect.y;
}
