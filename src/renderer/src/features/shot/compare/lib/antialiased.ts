import { brightnessOf } from './brightnessOf';
import { CHANNELS, FLAT_SIBLINGS } from './constants';
import { hasManySiblings } from './hasManySiblings';
import type { ComparedPixels } from './types';

/**
 * Whether a pixel of `own` that differs from `other` is anti-aliasing, as Vyšniauskas's detector (pixelmatch's) tells:
 * fewer than three neighbours of its own colour, some darker and some brighter, and the darkest or the brightest of
 * them in a flat area of both images, an edge's two sides. `shift` moves a place in `own` to the same one in `other`.
 */
export function antialiased(own: ComparedPixels, other: ComparedPixels, x: number, y: number, shift: { x: number; y: number }): boolean {
  const { data, width, height } = own;
  const [left, top, right, bottom] = [Math.max(x - 1, 0), Math.max(y - 1, 0), Math.min(x + 1, width - 1), Math.min(y + 1, height - 1)];
  const center = brightnessOf(data, (y * width + x) * CHANNELS);
  let same = x === left || x === right || y === top || y === bottom ? 1 : 0;
  // The darkest and the brightest neighbour: how much darker or brighter, and where (as an index into the image).
  let [darkest, darkestAt, brightest, brightestAt] = [0, 0, 0, 0];
  for (let ny = top; ny <= bottom; ny++) {
    for (let nx = left; nx <= right; nx++) {
      if (nx === x && ny === y) continue;
      const at = ny * width + nx;
      const delta = brightnessOf(data, at * CHANNELS) - center;
      if (delta === 0 && ++same >= FLAT_SIBLINGS) return false;
      if (delta < darkest) [darkest, darkestAt] = [delta, at];
      if (delta > brightest) [brightest, brightestAt] = [delta, at];
    }
  }
  if (!darkest || !brightest) return false;
  const flat = (at: number) => {
    const [fx, fy] = [at % width, Math.floor(at / width)];
    return hasManySiblings(own, fx, fy) && hasManySiblings(other, fx + shift.x, fy + shift.y);
  };
  return flat(darkestAt) || flat(brightestAt);
}
