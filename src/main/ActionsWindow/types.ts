import type { BrowserWindow } from 'electron';
import type { ActionsWindowState } from '../../shared/types';
import type { WindowStore } from '../store/WindowStore';

/** What the Actions window works with. */
export interface ActionsWindowDeps {
  /** The editor's window: the panel is docked there while it has no window of its own. */
  editor: BrowserWindow;
  store: WindowStore;
  /** Where the panel is changed: its state is announced (to both windows). */
  announce(state: ActionsWindowState): void;
}
