import type { BrowserWindow, WebContentsView } from 'electron';
import type { PageWindowStore } from '../store/PageWindowStore';

/** What the website window works with. */
export interface PageWindowDeps {
  /** The editor's window: the page is shown there unless it has a window of its own. */
  editor: BrowserWindow;
  /** The page's view, moved between the two. */
  view: WebContentsView;
  store: PageWindowStore;
  /** The website moved to its own window or back: its state (`detached`) is announced. */
  moved(): void;
}

/** How the website window's own events are handled. */
export interface PageWindowHooks {
  /** The window is asked to close (it stays: `closing` puts the website back, or leaves it for the quit). */
  closing(): void;
  /** Open it maximized, as it was. */
  maximized: boolean;
}
