/** The largest YIQ distance two colours can have (black against white): a threshold is a share of it. */
export const MAX_YIQ_DELTA = 35215;

/** How far apart two colours may be (a share of the largest distance, squared as pixelmatch does) and still count as the same. */
export const DEFAULT_THRESHOLD = 0.1;

/** Differing pixels are grouped into areas on a grid of cells this many pixels wide. */
export const REGION_CELL = 16;

/** At most this many areas are listed (a page that differs everywhere has one per cell). */
export const MAX_REGIONS = 200;

/** How a pixel the same in both shows in the difference: its brightness faded this much toward white. */
export const SAME_FADE = 0.1;

/** RGBA of a pixel that differs. */
export const DIFF_COLOR = [255, 0, 64, 255] as const;

/** RGBA of a pixel that differs only as anti-aliasing does (an edge smoothed another way): shown, not counted. */
export const SMOOTHED_COLOR = [255, 200, 0, 255] as const;

/** How many neighbours of its own colour make a pixel part of a flat area, and not of an edge (an image's side counts as one). */
export const FLAT_SIBLINGS = 3;

/** Channels per pixel in RGBA pixel data. */
export const CHANNELS = 4;
