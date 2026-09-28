import type { Rect } from '@common/types';

/** An image's pixels, RGBA, row by row. */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Two images compared: the first at 0,0, the second moved by the offset, over the box both cover together. */
export interface PixelDiff {
  /** The difference: differing pixels in red over a faded copy of the first image. */
  image: Pixels;
  /** How many pixels differ (a pixel only one image covers counts as differing). */
  differing: number;
  total: number;
  /** Boxes around the areas that differ, top to bottom. */
  regions: Rect[];
}
