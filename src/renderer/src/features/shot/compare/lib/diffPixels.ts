import { CHANNELS, DIFF_COLOR, MAX_YIQ_DELTA, REGION_CELL, SAME_FADE } from './constants';
import { regionsOf } from './regionsOf';
import { yiqDelta } from './yiqDelta';
import type { PixelDiff, Pixels } from './types';

/**
 * Compares two images pixel by pixel, the second moved by `offset`, over the box both cover together. Two pixels
 * differ when their YIQ distance is over `threshold` (a share of the largest, squared); a pixel only one image covers
 * differs too, so a size change shows.
 */
export function diffPixels(a: Pixels, b: Pixels, offset: { x: number; y: number }, threshold: number): PixelDiff {
  const width = Math.max(a.width, b.width + offset.x);
  const height = Math.max(a.height, b.height + offset.y);
  const out = new Uint8ClampedArray(width * height * CHANNELS);
  const columns = Math.ceil(width / REGION_CELL);
  const cells = new Uint8Array(columns * Math.ceil(height / REGION_CELL));
  const limit = MAX_YIQ_DELTA * threshold * threshold;
  let differing = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * CHANNELS;
      const inA = x < a.width && y < a.height;
      const [bx, by] = [x - offset.x, y - offset.y];
      const inB = bx >= 0 && by >= 0 && bx < b.width && by < b.height;
      const i = (y * a.width + x) * CHANNELS;
      const j = (by * b.width + bx) * CHANNELS;
      const differs = !inA || !inB || yiqDelta(a.data, i, b.data, j) > limit;
      if (differs) {
        differing++;
        cells[Math.floor(y / REGION_CELL) * columns + Math.floor(x / REGION_CELL)] = 1;
        out.set(DIFF_COLOR, o);
      } else {
        const gray = 255 + (a.data[i] * 0.299 + a.data[i + 1] * 0.587 + a.data[i + 2] * 0.114 - 255) * SAME_FADE;
        out.set([gray, gray, gray, 255], o);
      }
    }
  }
  return { image: { data: out, width, height }, differing, total: width * height, regions: regionsOf(cells, columns, Math.ceil(height / REGION_CELL), width, height) };
}
