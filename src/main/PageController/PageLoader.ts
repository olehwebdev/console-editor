import type { WebContents } from 'electron';
import type { PageInterception } from '../engine/PageInterception';
import { BLANK_PAGE } from './constants';
import { normalizeUrl } from './normalizeUrl';

/** Chromium's net error for a navigation replaced by another one (not a real failure), as a rejected `loadURL` names it. */
const ERR_ABORTED_MESSAGE = /ERR_ABORTED/;

/** Loads pages into the site's view, never before interception is set up in it. */
export class PageLoader {
  private ready: Promise<void> = Promise.resolve();

  /** `historyChanged` runs when Back/Forward changed without a navigation event. */
  constructor(
    private readonly wc: WebContents,
    private readonly engine: PageInterception,
    private readonly historyChanged: () => void,
  ) {}

  attach(): Promise<void> {
    this.ready = (async () => {
      // Renderer-side CDP commands (Page.enable, Network.enable…) never answer until
      // the view has a renderer, so give it an empty document first.
      await this.wc.loadURL(BLANK_PAGE);
      await this.engine.attach();
    })();
    return this.ready;
  }

  /** Loads `input`. With `fresh`, what came before it is dropped from Back once it has loaded. */
  async navigate(input: string, fresh: boolean): Promise<void> {
    const url = normalizeUrl(input);
    // Never load a site before interception is set up, or overrides would be missed.
    await this.ready;
    await this.engine.prepareReload(url);
    try {
      await this.wc.loadURL(url);
    } catch (err) {
      // Failures are reported through 'did-fail-load'.
      if (!ERR_ABORTED_MESSAGE.test(String(err))) console.warn(`loadURL(${url}) failed:`, err);
    }
    if (fresh) this.clearHistory();
  }

  /** Leaves the page for an empty one with no history. */
  async leave(): Promise<void> {
    await this.ready;
    await this.wc.loadURL(BLANK_PAGE).catch(() => undefined);
    this.clearHistory();
  }

  private clearHistory(): void {
    this.wc.navigationHistory.clear();
    // Back/Forward changed without a navigation event.
    this.historyChanged();
  }
}
