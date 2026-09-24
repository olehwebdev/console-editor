import type { NativeViewRect } from './types';

/** True when a DOMRect-like box and the rect share any area. */
export function rectsOverlap(box: { left: number; top: number; right: number; bottom: number }, rect: NativeViewRect): boolean {
  return box.left < rect.x + rect.width && box.right > rect.x && box.top < rect.y + rect.height && box.bottom > rect.y;
}
