/** Zoom steps of a shot's image, in CSS pixels per CSS pixel of the page it shows (1: as large as on the page). */
export const ZOOM_STEPS = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32] as const;

/** From this zoom up, pixels are drawn square and a grid shows between them. */
export const PIXEL_GRID_FROM = 8;

/** Where the pixel under the pointer is sampled: a 1×1 canvas. */
export const SAMPLE_SIZE = 1;

/** Hex digits of a colour channel. */
export const HEX_DIGITS = 2;
