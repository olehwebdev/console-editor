import type { CAPTURE_FAILED } from './constants';

export interface PagePreviewProps {
  /** Hide the native view (e.g. while a panel is being resized: it would swallow the drag). */
  suspended?: boolean;
  /**
   * Change it when something beside the panel may move it without resizing it
   * (e.g. a sidebar animating in or out): the view then follows the host
   * until it settles. Size changes are picked up on their own.
   */
  layoutKey?: unknown;
  addressBarRef?: (el: HTMLInputElement | null) => void;
}

/** The still shown while frozen: an image, CAPTURE_FAILED if capturing failed, or null while pending. */
export type Snapshot = string | typeof CAPTURE_FAILED | null;
