import type { Size } from 'electron';

/** How one of the app's own windows handles its own events. */
export interface WindowHooks {
  /** The window is asked to close (it stays: `closing` decides what happens). */
  closing(): void;
  /** Open it maximized, as it was. */
  maximized: boolean;
}

/** A window's own top bar, which takes the system's title bar's place on Linux: the window buttons are drawn over it. */
export interface TitleBarLook {
  /** Its background, behind the window buttons. */
  color: string;
  /** How tall the buttons' strip is: the bar's height, less a border at its foot that runs on under them. */
  height: number;
}

/** What one of the app's own windows is made with. */
export interface AppWindowOptions {
  /** Its title, kept whatever its UI's <title> says. */
  title: string;
  /** The smallest it can be made. */
  minSize: Size;
  /** Its UI's top bar. */
  titleBar: TitleBarLook;
}
