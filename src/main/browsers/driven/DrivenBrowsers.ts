import type { AppEvent, CaptureArea, DrivenBrowser, DrivenEngine, ShotBrowser } from '../../../shared/types';
import { HTTP_URL } from '../../constants';
import type { BrowserCapture, CapturedImage, Viewport } from '../../shots/capture';
import { PAGE_AREAS } from '../../shots/constants';
import type { FoundBrowser } from '../types';
import { connectChromium } from './chromium/connectChromium';
import { RELOAD_DEBOUNCE_MS } from './constants';
import { connectFirefox } from './firefox/connectFirefox';
import { shotBrowser } from './shotBrowser';
import type { ConnectDriver, DrivenBrowsersDeps, Driver } from './types';

/** How a browser of each engine is driven (the UI offers what `DRIVEN_ENGINES` lists); another can't be served the workspace's changes. */
const DRIVERS: Readonly<Record<DrivenEngine, ConnectDriver>> = { chromium: connectChromium, gecko: connectFirefox };

/** What each app event means for the driven browsers; the rest mean nothing to them. */
type AppEventReactions = Partial<Record<AppEvent['type'], () => void>>;

/**
 * The browsers the app drives (Chromium ones and Firefox), one per installed browser, each with a profile of the app's
 * own: launched (or reached again) when an address is first opened in one with the workspace's changes, and kept in
 * step with them. Every change is announced as `driven-browsers-changed`.
 */
export class DrivenBrowsers {
  private readonly driven = new Map<string, Driver>();
  private readonly starting = new Map<string, Promise<Driver>>();
  private reloadTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly reactions: AppEventReactions = {
    'overrides-changed': () => this.served(),
    'rules-changed': () => this.served(),
    'settings-changed': () => void Promise.all(this.all().map((d) => d.applySettings())),
  };

  constructor(private readonly deps: DrivenBrowsersDeps) {}

  list(): DrivenBrowser[] {
    return this.all().map((d) => d.list());
  }

  /** The driven browsers with their tabs' titles and addresses as they are now. */
  async read(): Promise<DrivenBrowser[]> {
    await Promise.all(this.all().map((d) => d.readTabs()));
    return this.list();
  }

  /** Opens an http(s) address in a Chromium browser with the workspace's changes, launching it if need be. */
  async open(id: string, url: string): Promise<void> {
    if (!HTTP_URL.test(url)) throw new Error('Only http(s) pages open in another browser');
    const browser = await this.deps.registry.get(id);
    const connect = Object.hasOwn(DRIVERS, browser.engine) ? DRIVERS[browser.engine as DrivenEngine] : undefined;
    if (!connect) throw new Error(`${browser.name} can't be served your changes: only Chromium browsers and Firefox can`);
    await (await this.reach(browser, connect)).open(url);
  }

  activate(browserId: string, tabId: string): Promise<void> {
    return this.get(browserId).activate(tabId);
  }

  /** Captures a tab of a driven browser, with the address it showed and the browser it was taken in. */
  async capture(browserId: string, tabId: string, area: unknown): Promise<{ image: CapturedImage; url: string; browser: ShotBrowser }> {
    if (!PAGE_AREAS.has(area)) throw new Error('Invalid capture area');
    const driven = this.get(browserId);
    return { ...(await driven.capture(tabId, area as Exclude<CaptureArea, 'element'>)), browser: shotBrowser(driven) };
  }

  /** Captures the whole page at `url` in every driven browser at once, laid out in `viewport`; one that fails says why. */
  captureAt(url: string, viewport: Viewport): Promise<BrowserCapture[]> {
    return Promise.all(
      this.all().map((driven) =>
        driven.captureAt(url, viewport).then(
          (taken) => ({ ...taken, browser: shotBrowser(driven) }),
          (err: unknown) => ({ browser: driven.browser.name, reason: err instanceof Error ? err.message : String(err) }),
        ),
      ),
    );
  }

  /** Stops serving the workspace's changes in a browser; it stays open. */
  stop(browserId: string): void {
    this.get(browserId).stop();
    this.driven.delete(browserId);
    this.changed();
  }

  /** Told every app event: overrides, rules and settings that change are served in the driven tabs too. */
  onAppEvent(event: AppEvent): void {
    this.reactions[event.type]?.();
  }

  /** Lets go of every driven browser (the app is quitting); they stay open. */
  dispose(): void {
    clearTimeout(this.reloadTimer);
    for (const driven of this.all()) driven.stop();
    this.driven.clear();
  }

  private all(): Driver[] {
    return [...this.driven.values()];
  }

  private get(id: string): Driver {
    const driven = this.driven.get(id);
    if (!driven) throw new Error("That browser isn't open with your changes any more");
    return driven;
  }

  /** The driven browser for an installed one: already connected, connecting, or launched now. */
  private reach(browser: FoundBrowser, connect: ConnectDriver): Promise<Driver> {
    const driven = this.driven.get(browser.id);
    if (driven) return Promise.resolve(driven);
    const starting = this.starting.get(browser.id) ?? this.connect(browser, connect).finally(() => this.starting.delete(browser.id));
    this.starting.set(browser.id, starting);
    return starting;
  }

  private async connect(browser: FoundBrowser, connect: ConnectDriver): Promise<Driver> {
    const closed = () => {
      this.driven.delete(browser.id);
      this.changed();
    };
    const driven = await connect(browser, { sources: this.deps.sources, userData: this.deps.userData, changed: () => this.changed(), closed });
    this.driven.set(browser.id, driven);
    this.changed();
    return driven;
  }

  /** Overrides or rules changed: each tab intercepts what they now need, and reloads (after a burst, once) if the settings say so. */
  private served(): void {
    void Promise.all(this.all().map((d) => d.refresh()));
    if (!this.deps.sources.settings.get().autoReloadOnSave || this.driven.size === 0) return;
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => void Promise.all(this.all().map((d) => d.reload())), RELOAD_DEBOUNCE_MS);
  }

  private changed(): void {
    this.deps.send({ type: 'driven-browsers-changed', driven: this.list() });
  }
}
