import { antialiased } from './antialiased';
import { comparedOf } from './comparedOf';
import { CHANNELS, DIFF_COLOR, MAX_YIQ_DELTA, REGION_CELL, SAME_FADE, SMOOTHED_COLOR } from './constants';
import { regionsOf } from './regionsOf';
import { yiqDelta } from './yiqDelta';
import type { PixelDiff, Pixels } from './types';

/**
 * Compares two images pixel by pixel, the second moved by `offset`, over the box both cover together. Two pixels
 * differ when their YIQ distance is over `threshold` (a share of the largest, squared); a pixel only one image covers
 * differs too, so a size change shows. A pair that differs only as anti-aliasing does (in either image) is shown apart,
 * and not counted: two browsers smooth the same edges differently.
 */
export function diffPixels(a: Pixels, b: Pixels, offset: { x: number; y: number }, threshold: number): PixelDiff {
  const width = Math.max(a.width, b.width + offset.x);
  const height = Math.max(a.height, b.height + offset.y);
  const [first, second] = [comparedOf(a), comparedOf(b)];
  const back = { x: -offset.x, y: -offset.y };
  const out = new Uint8ClampedArray(width * height * CHANNELS);
  const columns = Math.ceil(width / REGION_CELL);
  const cells = new Uint8Array(columns * Math.ceil(height / REGION_CELL));
  const limit = MAX_YIQ_DELTA * threshold * threshold;
  let differing = 0;
  let smoothed = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * CHANNELS;
      const [bx, by] = [x - offset.x, y - offset.y];
      const inBoth = x < a.width && y < a.height && bx >= 0 && by >= 0 && bx < b.width && by < b.height;
      const i = (y * a.width + x) * CHANNELS;
      if (inBoth && yiqDelta(a.data, i, b.data, (by * b.width + bx) * CHANNELS) <= limit) {
        out.fill(255 + (a.data[i] * 0.299 + a.data[i + 1] * 0.587 + a.data[i + 2] * 0.114 - 255) * SAME_FADE, o, o + CHANNELS - 1);
        out[o + CHANNELS - 1] = 255;
      } else if (inBoth && (antialiased(first, second, x, y, back) || antialiased(second, first, bx, by, offset))) {
        smoothed++;
        out.set(SMOOTHED_COLOR, o);
      } else {
        differing++;
        cells[Math.floor(y / REGION_CELL) * columns + Math.floor(x / REGION_CELL)] = 1;
        out.set(DIFF_COLOR, o);
      }
    }
  }
  return { image: { data: out, width, height }, differing, smoothed, total: width * height, regions: regionsOf(cells, columns, Math.ceil(height / REGION_CELL), width, height) };
}
