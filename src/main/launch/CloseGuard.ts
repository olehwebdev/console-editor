import type { BrowserWindow } from 'electron';
import type { AppEvent } from '../../shared/types';
import { confirmLosingEdits } from './confirmLosingEdits';
import { galleryMode } from './constants';

/** How long closing waits for the renderer to write its drafts. */
const FLUSH_TIMEOUT_MS = 5000;

/**
 * Closing keeps unsaved edits as drafts (reopened next time) instead of asking to discard them:
 * the renderer writes what it hasn't yet, then answers. Installing an update does the same first.
 * (The design-system gallery has no drafts to keep.)
 */
export class CloseGuard {
  private closeReady = galleryMode;
  private flushing: Promise<boolean> | undefined;
  private answerFlush: ((ok: boolean) => void) | undefined;

  constructor(
    private readonly win: BrowserWindow,
    private readonly send: (event: AppEvent) => void,
  ) {
    win.on('close', (event) => {
      if (this.closeReady) return;
      event.preventDefault();
      void this.prepareToQuit().then((ok) => {
        if (ok && !win.isDestroyed()) win.close();
      });
    });
  }

  /** True once drafts are written, or the user accepts losing them. */
  prepareToQuit(): Promise<boolean> {
    if (this.closeReady) return Promise.resolve(true);
    this.flushing ??= new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => this.answerFlush?.(false), FLUSH_TIMEOUT_MS);
      this.answerFlush = (ok) => {
        clearTimeout(timer);
        this.answerFlush = undefined;
        resolve(ok);
      };
      this.send({ type: 'flush-session' });
    }).then((ok) => {
      this.flushing = undefined;
      if (!ok && !this.win.isDestroyed() && !confirmLosingEdits(this.win)) return false;
      this.closeReady = true;
      return true;
    });
    return this.flushing;
  }

  /** The app stays after all: closing the window saves drafts again. */
  cancelQuit(): void {
    this.closeReady = galleryMode;
  }

  /** The renderer's answer to `flush-session`: whether it wrote its drafts. */
  flushed(ok: boolean): void {
    this.answerFlush?.(ok);
  }
}
