import { nativeViewRect } from './nativeViewRect';
import type { NativeViewRect } from './types';

/**
 * Where the native page view is placed while a page is shown, including while
 * it is swapped for a snapshot (so a widget that froze the page keeps seeing
 * the overlap). An empty rect or `null` means there is no view to avoid.
 */
export function setNativeViewRect(rect: NativeViewRect | null): void {
  nativeViewRect.current = rect && rect.width > 0 && rect.height > 0 ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
}
