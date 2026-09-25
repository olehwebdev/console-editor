import { app, screen, type BrowserWindow, type WebContents } from 'electron';
import { ACTIONS_WINDOW_HASH } from '../../shared/constants';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { ActionsWindowState, AppEvent } from '../../shared/types';
import { loadEditor } from '../launch/loadEditor';
import { createAppWindow, placeWindow, setUpWindow, syncMenuCheck, trackPlacement } from '../windows';
import { ACTIONS_WINDOW_MENU_ID, ACTIONS_WINDOW_SIZE, ACTIONS_WINDOW_TITLE, FORWARDED_EVENTS, MIN_ACTIONS_WINDOW_SIZE } from './constants';
import type { ActionsWindowDeps } from './types';

/**
 * Where the Actions panel is: docked in the editor's sidebar, or in a window of
 * its own that can go to another screen or stay above the page. The window's UI
 * is fed the few events its panel shows. Closing it docks the panel; quitting
 * leaves it where it is, to open there next time.
 */
export class ActionsWindow {
  private win: BrowserWindow | undefined;
  /** Saves the window's bounds at once (they are also saved as it moves). */
  private savePlacement: (() => void) | undefined;
  /** The app is quitting, and hasn't asked the window to close yet. */
  private quitting = false;

  constructor(private readonly deps: ActionsWindowDeps) {
    app.on('before-quit', () => (this.quitting = this.detached));
  }

  get detached(): boolean {
    return this.win !== undefined;
  }

  state(): ActionsWindowState {
    return { detached: this.detached, onTop: !!this.deps.store.get().onTop };
  }

  /** Whether `sender` is the Actions window's UI, which may run and change actions too. */
  owns(sender: WebContents): boolean {
    return !!this.win && !this.win.isDestroyed() && sender === this.win.webContents;
  }

  /** Moves the panel into its own window, where it was last (on a screen still there), or brings that window forward. */
  async detach(): Promise<void> {
    if (this.win) return this.show(this.win);
    const { store, editor } = this.deps;
    if (editor.isDestroyed()) return;
    const saved = store.get();
    const bounds = placeWindow(saved.bounds, screen.getAllDisplays().map((d) => d.workArea), editor.getBounds(), ACTIONS_WINDOW_SIZE);
    const win = createAppWindow(bounds, { title: ACTIONS_WINDOW_TITLE, minSize: MIN_ACTIONS_WINDOW_SIZE });
    this.win = win;
    this.savePlacement = trackPlacement(win, store);
    setUpWindow(win, { closing: () => this.closing(), maximized: !!saved.maximized });
    win.setAlwaysOnTop(!!saved.onTop);
    void store.update({ detached: true });
    this.announce();
    await loadEditor(win, ACTIONS_WINDOW_HASH).catch((err: unknown) => {
      // Docked, or gone with the editor, while its UI loaded: nothing waits for it any more.
      if (this.win === win) throw err;
    });
  }

  /** Docks the panel in the editor's sidebar again, closing its window. */
  attach(): void {
    const win = this.win;
    if (!win) return;
    this.savePlacement?.();
    this.win = undefined;
    if (!win.isDestroyed()) win.destroy();
    void this.deps.store.update({ detached: false });
    this.announce();
  }

  /** Keeps the window above the others, or not; remembered for the next time it opens. */
  setOnTop(onTop: unknown): void {
    if (typeof onTop !== 'boolean') throw new Error('onTop must be true or false');
    void this.deps.store.update({ onTop });
    this.win?.setAlwaysOnTop(onTop);
    this.announce();
  }

  /** Hands the window's UI an event its panel shows; the editor's other events aren't its business. */
  forward(event: AppEvent): void {
    const win = this.win;
    if (win && !win.isDestroyed() && FORWARDED_EVENTS.has(event.type)) win.webContents.send(IPC_CHANNEL.onEvent, event);
  }

  /** The editor's window is gone (the app is quitting): this window goes too, and opens again next time. */
  dispose(): void {
    this.savePlacement?.();
    const win = this.win;
    this.win = undefined;
    if (win && !win.isDestroyed()) win.destroy();
  }

  /** The window is asked to close: it docks the panel instead (once the close event is over), unless the app quits. */
  private closing(): void {
    if (this.quitting) {
      this.quitting = false;
      return;
    }
    queueMicrotask(() => this.attach());
  }

  private show(win: BrowserWindow): void {
    if (win.isMinimized()) win.restore();
    win.focus();
  }

  private announce(): void {
    syncMenuCheck(ACTIONS_WINDOW_MENU_ID, this.detached);
    this.deps.announce(this.state());
  }
}
