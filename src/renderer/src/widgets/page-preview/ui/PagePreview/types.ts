import type { CAPTURE_FAILED } from './constants';

/** Where the preview is shown: in the editor's window, or as the website's own window. */
export type PreviewPlacement = 'editor' | 'window';

export interface PagePreviewProps {
  /** Where it is shown ('editor' by default): its toolbar offers to move it to the other place. */
  placement?: PreviewPlacement;
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
