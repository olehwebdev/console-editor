/** How a design laid over the page shows. */
export interface OverlaySettings {
  /** 0 (hidden) to 1 (opaque). */
  opacity: number;
  /** `difference`: what matches the page goes black, what doesn't lights up. */
  blend: 'normal' | 'difference';
  /** Its colours inverted (with the page's, what matches goes grey). */
  invert: boolean;
  /** Where its top left is on the page (or the viewport), in CSS pixels. */
  x: number;
  y: number;
  /** `page`: it scrolls with the page. `viewport`: it stays put while the page scrolls under it. */
  attached: 'page' | 'viewport';
  hidden: boolean;
  /** The page is laid out at the design's width, and scaled to fit the preview when that is narrower. */
  fitWidth: boolean;
}

/** The design laid over the page, while there is one. */
export interface OverlayState {
  shotId: string;
  name: string;
  /** Its size in CSS pixels. */
  width: number;
  height: number;
  settings: OverlaySettings;
}
