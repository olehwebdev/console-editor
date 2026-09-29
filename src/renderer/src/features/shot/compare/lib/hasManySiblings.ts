import { FLAT_SIBLINGS } from './constants';
import type { ComparedPixels } from './types';

/** Whether a pixel is in a flat area: enough of its neighbours are exactly its colour. False outside the image. */
export function hasManySiblings({ colors, width, height }: ComparedPixels, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const [left, top, right, bottom] = [Math.max(x - 1, 0), Math.max(y - 1, 0), Math.min(x + 1, width - 1), Math.min(y + 1, height - 1)];
  const color = colors[y * width + x];
  let same = x === left || x === right || y === top || y === bottom ? 1 : 0;
  for (let ny = top; ny <= bottom; ny++) {
    for (let nx = left; nx <= right; nx++) {
      if ((nx !== x || ny !== y) && colors[ny * width + nx] === color && ++same >= FLAT_SIBLINGS) return true;
    }
  }
  return false;
}
