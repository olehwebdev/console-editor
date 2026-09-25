import { app, screen, type BrowserWindow, type WebContents } from 'electron';
import { PAGE_WINDOW_HASH } from '../../shared/constants';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { AppEvent, PageState, Rect } from '../../shared/types';
import { loadEditor } from '../launch/loadEditor';
import { UNTITLED } from './constants';
import { createPageWindow } from './createPageWindow';
import { placePageWindow } from './placePageWindow';
import { setUpPageWindow } from './setUpPageWindow';
import { syncMenuCheck } from './syncMenuCheck';
import { toViewBounds } from './toViewBounds';
import { trackPlacement } from './trackPlacement';
import type { PageWindowDeps } from './types';

/** Bounds that show nothing, until the UI of the window the view moved to has measured where it goes. */
const NO_BOUNDS = { x: 0, y: 0, width: 0, height: 0 };

/**
 * Where the website is shown: in the editor's window, or in a window of its
 * own that can go to another screen. The page's view moves between them and
 * keeps running, and its interception with it (both are bound to its
 * `webContents`, not to a window). Closing the website's window puts the
 * website back; quitting leaves it where it is, to open there next time.
 */
export class PageWindow {
  private win: BrowserWindow | undefined;
  /** Saves the website window's bounds at once (they are also saved as it moves). */
  private savePlacement: (() => void) | undefined;
  /** The app is quitting, and hasn't asked the website window to close yet. */
  private quitting = false;

  constructor(private readonly deps: PageWindowDeps) {
    app.on('before-quit', () => (this.quitting = this.detached));
  }

  get detached(): boolean {
    return this.win !== undefined;
  }

  /** The window the page is shown in. */
  get host(): BrowserWindow {
    return this.win ?? this.deps.editor;
  }

  /** Whether `sender` is the website window's UI, which may navigate and place the page too. */
  owns(sender: WebContents): boolean {
    return !!this.win && !this.win.isDestroyed() && sender === this.win.webContents;
  }

  /** Places the page on the box the UI of the window showing it measured (CSS pixels); other windows' reports are stale. */
  place(sender: WebContents, rect: Rect): void {
    if (sender !== this.host.webContents) return;
    // The UI measures CSS pixels; the view is placed in window pixels (they differ when the UI is zoomed).
    const zoom = sender.getZoomFactor();
    this.deps.view.setBounds(toViewBounds({ x: rect.x * zoom, y: rect.y * zoom, width: rect.width * zoom, height: rect.height * zoom }));
  }

  /** Moves the website to a window of its own, where it was last (on a screen still there), or brings that window forward. */
  async detach(): Promise<void> {
    if (this.win) return this.focusAddressBar();
    const { store, editor } = this.deps;
    const saved = store.get();
    const win = createPageWindow(placePageWindow(saved.bounds, screen.getAllDisplays().map((d) => d.workArea), editor.getBounds()));
    this.win = win;
    this.savePlacement = trackPlacement(win, store);
    setUpPageWindow(win, { closing: () => this.closing(), maximized: !!saved.maximized });
    this.moveView(win);
    void store.update({ detached: true });
    this.announce();
    await loadEditor(win, PAGE_WINDOW_HASH);
  }

  /** Puts the website back into the editor's window and closes its own. */
  attach(): void {
    if (!this.putBack()) return;
    void this.deps.store.update({ detached: false });
    this.announce();
  }

  /** Brings the website window forward with its address bar focused. */
  focusAddressBar(): void {
    const win = this.win;
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
    win.webContents.send(IPC_CHANNEL.onEvent, { type: 'command', command: 'focus-url' } satisfies AppEvent);
  }

  /** Shows the page's state in the website window's UI (its toolbar), and its title on the window. */
  showState(state: PageState): void {
    const win = this.win;
    if (!win || win.isDestroyed()) return;
    win.webContents.send(IPC_CHANNEL.onEvent, { type: 'page-state', state } satisfies AppEvent);
    win.setTitle(state.title || UNTITLED);
  }

  /** The editor's window is gone (the app is quitting): the website window goes too, and opens again next time. */
  dispose(): void {
    this.savePlacement?.();
    const win = this.win;
    this.win = undefined;
    if (win && !win.isDestroyed()) win.destroy();
  }

  /** The website window is asked to close: it puts the website back instead (once the close event is over). */
  private closing(): void {
    // By the quit: it stays as it is, to go with the editor's window (`dispose`) and open again next time. Should
    // the editor stay (its drafts couldn't be written), nothing has moved.
    if (this.quitting) {
      this.quitting = false;
      return;
    }
    queueMicrotask(() => this.attach());
  }

  /** Moves the view back into the editor and destroys the website window. Returns whether there was one. */
  private putBack(): boolean {
    const win = this.win;
    if (!win) return false;
    this.savePlacement?.();
    this.win = undefined;
    this.moveView(this.deps.editor);
    if (!win.isDestroyed()) win.destroy();
    return true;
  }

  private moveView(to: BrowserWindow): void {
    to.contentView.addChildView(this.deps.view);
    this.deps.view.setBounds(NO_BOUNDS);
  }

  private announce(): void {
    syncMenuCheck(this.detached);
    this.deps.moved();
  }
}
