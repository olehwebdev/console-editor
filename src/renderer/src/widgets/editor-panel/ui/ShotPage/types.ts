/** How large a shot's image is shown: fitted to the pane's width, or a zoom step. */
export type ShotZoom = 'fit' | number;

/** The pixel under the pointer: where it is on the page (CSS pixels) and its colour (`#rrggbb`, once read). */
export interface PixelUnderPointer {
  x: number;
  y: number;
  color: string | null;
}
