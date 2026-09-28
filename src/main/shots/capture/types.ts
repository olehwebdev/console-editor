import type { Rect } from '../../../shared/types';

/** What to capture: what the viewport shows, the whole page, or a box of it (an element's, in the top viewport's CSS pixels). */
export type CaptureTarget = { area: 'viewport' } | { area: 'page' } | { area: 'element'; box: Rect };

/** A capture's image and what it was taken at. */
export interface CapturedImage {
  bytes: Buffer;
  width: number;
  height: number;
  /** Device pixels per CSS pixel in the image. */
  scale: number;
  /** The viewport, in CSS pixels. */
  viewport: { width: number; height: number };
}

/** What `Page.getLayoutMetrics` says, in CSS pixels. */
export interface LayoutMetrics {
  cssLayoutViewport: { pageX: number; pageY: number; clientWidth: number; clientHeight: number };
  cssContentSize: { width: number; height: number };
}
