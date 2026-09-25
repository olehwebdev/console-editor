import type { BrowserWindow, WebContentsView } from 'electron';
import type { WindowStore } from '../store/WindowStore';

/** What the website window works with. */
export interface PageWindowDeps {
  /** The editor's window: the page is shown there unless it has a window of its own. */
  editor: BrowserWindow;
  /** The page's view, moved between the two. */
  view: WebContentsView;
  store: WindowStore;
  /** The website moved to its own window or back: its state (`detached`) is announced. */
  moved(): void;
}
