import type { Size } from 'electron';

/** How one of the app's own windows handles its own events. */
export interface WindowHooks {
  /** The window is asked to close (it stays: `closing` decides what happens). */
  closing(): void;
  /** Open it maximized, as it was. */
  maximized: boolean;
}

/** What one of the app's own windows is made with. */
export interface AppWindowOptions {
  /** Its title, kept whatever its UI's <title> says. */
  title: string;
  /** The smallest it can be made. */
  minSize: Size;
}
