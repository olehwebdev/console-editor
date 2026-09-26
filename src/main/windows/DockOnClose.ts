import { app } from 'electron';

/**
 * What a window of its own does when asked to close (`setUpWindow`'s `closing`): it docks what it shows back in
 * the editor's window, unless the app is quitting. The quit leaves it as it is, to go with the editor's window
 * (its owner's `dispose`) and open there again next time; should the editor stay (its drafts couldn't be written),
 * nothing has moved.
 */
export class DockOnClose {
  /** The app is quitting, and hasn't asked the window to close yet. */
  private quitting = false;

  constructor(
    detached: () => boolean,
    private readonly dock: () => void,
  ) {
    app.on('before-quit', () => (this.quitting = detached()));
  }

  /** The window is asked to close (and stays: `setUpWindow` cancels the close). */
  closing(): void {
    if (this.quitting) {
      this.quitting = false;
      return;
    }
    // Once the close event is over. Not in a microtask: that runs before the event returns to Electron, which then
    // goes on with a window `dock` destroyed under it (the app crashed now and then).
    setImmediate(this.dock);
  }
}
