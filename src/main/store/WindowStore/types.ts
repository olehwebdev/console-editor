import type { Rectangle } from 'electron';

/** What is kept of one of the app's own windows (the website's, the Actions panel's). */
export interface SavedWindow {
  /** It was open when the app last ran (or is now): its content wasn't docked in the editor. */
  detached: boolean;
  /** The window's last bounds when not maximized, in screen coordinates. */
  bounds?: Rectangle;
  maximized?: boolean;
  /** It stays above other windows. */
  onTop?: boolean;
}
