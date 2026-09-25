import type { Rectangle } from 'electron';

/** What is kept of the website's own window. */
export interface SavedPageWindow {
  /** The website was in its own window when the app last ran (or is now). */
  detached: boolean;
  /** The window's last bounds when not maximized, in screen coordinates. */
  bounds?: Rectangle;
  maximized?: boolean;
}
