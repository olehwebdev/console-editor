import { homedir } from 'node:os';
import type { AppEvent, CaptureArea, DrivenBrowser, DrivenEngine, ShotBrowser } from '../../../shared/types';
import { HTTP_URL } from '../../constants';
import type { PageDesign } from '../../overlay';
import type { BrowserCapture, CapturedImage, Viewport } from '../../shots/capture';
import { PAGE_AREAS } from '../../shots/constants';
import type { FoundBrowser } from '../types';
import { captureEvery } from './captureEvery';
import { connectChromium } from './chromium/connectChromium';
import { RELOAD_DEBOUNCE_MS } from './constants';
import { DriverPool } from './DriverPool';
import { EVERYDAY_KEY_SUFFIX, EVERYDAY_NAME_SUFFIX } from './everyday/constants';
import { connectEverydayChrome } from './everyday/connectEverydayChrome';
import { connectFirefox } from './firefox/connectFirefox';
import { shotBrowser } from './shotBrowser';
import type { ConnectDriver, DrivenBrowsersDeps, Driver } from './types';

/** How a browser of each engine is driven (the UI offers what `DRIVEN_ENGINES` lists); another can't be served the workspace's changes. */
const DRIVERS: Readonly<Record<DrivenEngine, ConnectDriver>> = { chromium: connectChromium, gecko: connectFirefox };

/** What each app event means for the driven browsers; the rest mean nothing to them. */
type AppEventReactions = Partial<Record<AppEvent['type'], () => void>>;

/**
 * The browsers the app drives (Chromium ones and Firefox, each with a profile of the app's own, and your everyday
 * Chrome when remote debugging is on for it): launched or reached when an address is first opened in one with the
 * workspace's changes, and kept in step with them. Every change is announced as `driven-browsers-changed`.
 */
export class DrivenBrowsers {
  private readonly pool = new DriverPool();
  private reloadTimer: ReturnType<typeof setTimeout> | undefined;
  /** The design over the app's page, if any: driven tabs have it too. */
  private design: PageDesign | null = null;
  private readonly reactions: AppEventReactions = {
    'overrides-changed': () => this.served(),
    'rules-changed': () => this.served(),
    'settings-changed': () => void Promise.all(this.pool.all().map((d) => d.applySettings())),
  };

  constructor(private readonly deps: DrivenBrowsersDeps) {}

  list(): DrivenBrowser[] {
    return this.pool.all().map((d) => d.list());
  }

  /** The driven browsers with their tabs' titles and addresses as they are now. */
  async read(): Promise<DrivenBrowser[]> {
    await Promise.all(this.pool.all().map((d) => d.readTabs()));
    return this.list();
  }

  /**
   * Opens an http(s) address in a browser with the workspace's changes: with a profile of the app's own (launched if
   * need be), or in your everyday Chromium browser (`everyday`), remote debugging turned on for it.
   */
  async open(id: string, url: string, everyday = false): Promise<void> {
    if (!HTTP_URL.test(url)) throw new Error('Only http(s) pages open in another browser');
    const browser = await this.deps.registry.get(id);
    const own = Object.hasOwn(DRIVERS, browser.engine) ? DRIVERS[browser.engine as DrivenEngine] : undefined;
    const connect = everyday ? (browser.engine === 'chromium' ? connectEverydayChrome : undefined) : own;
    if (!connect) throw new Error(`${browser.name} can't be served your changes: only Chromium browsers${everyday ? '' : ' and Firefox'} can`);
    const listedAs = everyday ? { id: `${id}${EVERYDAY_KEY_SUFFIX}`, name: `${browser.name}${EVERYDAY_NAME_SUFFIX}`, everyday } : { id, name: browser.name, everyday };
    const driver = await this.pool.reach(listedAs.id, () => this.connect(browser, listedAs, connect));
    this.changed();
    await driver.open(url);
  }

  activate(key: string, tabId: string): Promise<void> {
    return this.pool.get(key).activate(tabId);
  }

  /** Captures a tab of a driven browser, with the address it showed and the browser it was taken in. */
  async capture(key: string, tabId: string, area: unknown): Promise<{ image: CapturedImage; url: string; browser: ShotBrowser }> {
    if (!PAGE_AREAS.has(area)) throw new Error('Invalid capture area');
    const driven = this.pool.get(key);
    return { ...(await driven.capture(tabId, area as Exclude<CaptureArea, 'element'>)), browser: shotBrowser(driven) };
  }

  /** Captures the whole page at `url` in every driven browser at once, laid out in `viewport`; one that fails says why. */
  captureAt(url: string, viewport: Viewport): Promise<BrowserCapture[]> {
    return captureEvery(this.pool.all(), url, viewport);
  }

  /** Stops serving the workspace's changes in a browser; it stays open. */
  stop(key: string): void {
    this.pool.get(key).stop();
    this.pool.remove(key);
    this.changed();
  }

  /** Lays the design over the app's page over every driven tab too (null: takes it off), and over tabs opened later. */
  async setDesign(design: PageDesign | null): Promise<void> {
    this.design = design;
    await Promise.all(this.pool.all().map((d) => d.setDesign(design).catch(() => undefined)));
  }

  /** Told every app event: overrides, rules and settings that change are served in the driven tabs too. */
  onAppEvent(event: AppEvent): void {
    this.reactions[event.type]?.();
  }

  /** Lets go of every driven browser (the app is quitting); they stay open. */
  dispose(): void {
    clearTimeout(this.reloadTimer);
    for (const driven of this.pool.clear()) driven.stop();
  }

  private async connect(browser: FoundBrowser, listedAs: { id: string; name: string; everyday: boolean }, connect: ConnectDriver): Promise<Driver> {
    const closed = () => {
      this.pool.remove(listedAs.id);
      this.changed();
    };
    const { sources, userData } = this.deps;
    const driven = await connect(browser, { sources, userData, home: this.deps.home ?? homedir(), listedAs, changed: () => this.changed(), closed });
    await driven.setDesign(this.design).catch(() => undefined);
    return driven;
  }

  /** Overrides or rules changed: each tab intercepts what they now need, and reloads (after a burst, once) if the settings say so. */
  private served(): void {
    void Promise.all(this.pool.all().map((d) => d.refresh()));
    if (!this.deps.sources.settings.get().autoReloadOnSave || this.pool.size === 0) return;
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => void Promise.all(this.pool.all().map((d) => d.reload())), RELOAD_DEBOUNCE_MS);
  }

  private changed(): void {
    this.deps.send({ type: 'driven-browsers-changed', driven: this.list() });
  }
}
