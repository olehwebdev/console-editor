import type { Rect } from '@common/types';

/** An image's pixels, RGBA, row by row. */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** An image's pixels, each also as one number (its RGBA's four bytes), to find the same colour at once. */
export interface ComparedPixels extends Pixels {
  colors: Uint32Array;
}

/** Two images compared: the first at 0,0, the second moved by the offset, over the box both cover together. */
export interface PixelDiff {
  /** The difference: differing pixels in red (anti-aliasing in yellow) over a faded copy of the first image. */
  image: Pixels;
  /** How many pixels differ (a pixel only one image covers counts as differing). */
  differing: number;
  /** How many more differ only as anti-aliasing does: shown in yellow, not counted as differing or boxed. */
  smoothed: number;
  total: number;
  /** Boxes around the areas that differ, top to bottom. */
  regions: Rect[];
}
