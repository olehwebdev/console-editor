import type { Rectangle } from 'electron';
import type { Rect } from '../../shared/types';

/** A rectangle the renderer measured, as whole, non-negative view bounds. */
export function toViewBounds(rect: Rect): Rectangle {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };
}
