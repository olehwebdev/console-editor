import type { Rect } from '../../../shared/types';

/** A box cut top to bottom into parts `height` tall, the last one what is left. */
export function partsOf(box: Rect, height: number): Rect[] {
  const parts: Rect[] = [];
  for (let y = 0; y < box.height; y += height) parts.push({ ...box, y: box.y + y, height: Math.min(height, box.height - y) });
  return parts;
}
