import type { AppEvent, CaptureArea, DrivenBrowser, ShotBrowser } from '../../../shared/types';
import { HTTP_URL } from '../../constants';
import { CDP } from '../../engine/constants';
import type { CapturedImage } from '../../shots/capture';
import { PAGE_AREAS } from '../../shots/constants';
import type { FoundBrowser } from '../types';
import { PRODUCT_VERSION, RELOAD_DEBOUNCE_MS } from './constants';
import { DrivenChromium } from './DrivenChromium';
import { profileDir } from './profileDir';
import { reachOrLaunch } from './reachOrLaunch';
import type { DrivenBrowsersDeps } from './types';

/** What each app event means for the driven browsers; the rest mean nothing to them. */
type AppEventReactions = Partial<Record<AppEvent['type'], () => void>>;

/**
 * The Chromium browsers the app drives, one per installed browser, each with a profile of the app's own: launched (or
 * reached again) when an address is first opened in one with the workspace's changes, and kept in step with them.
 * Every change is announced as `driven-browsers-changed`.
 */
export class DrivenBrowsers {
  private readonly driven = new Map<string, DrivenChromium>();
  private readonly starting = new Map<string, Promise<DrivenChromium>>();
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
    if (browser.engine !== 'chromium') throw new Error(`${browser.name} can't be served your changes: only Chromium browsers can, for now`);
    await (await this.reach(browser)).open(url);
  }

  activate(browserId: string, tabId: string): Promise<void> {
    return this.get(browserId).activate(tabId);
  }

  /** Captures a tab of a driven browser, with the address it showed and the browser it was taken in. */
  async capture(browserId: string, tabId: string, area: unknown): Promise<{ image: CapturedImage; url: string; browser: ShotBrowser }> {
    if (!PAGE_AREAS.has(area)) throw new Error('Invalid capture area');
    const driven = this.get(browserId);
    const { id, name, version } = driven.list();
    return { ...(await driven.capture(tabId, area as Exclude<CaptureArea, 'element'>)), browser: { id, name, version } };
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

  private all(): DrivenChromium[] {
    return [...this.driven.values()];
  }

  private get(id: string): DrivenChromium {
    const driven = this.driven.get(id);
    if (!driven) throw new Error("That browser isn't open with your changes any more");
    return driven;
  }

  /** The driven browser for an installed one: already connected, connecting, or launched now. */
  private reach(browser: FoundBrowser): Promise<DrivenChromium> {
    const driven = this.driven.get(browser.id);
    if (driven) return Promise.resolve(driven);
    const starting = this.starting.get(browser.id) ?? this.connect(browser).finally(() => this.starting.delete(browser.id));
    this.starting.set(browser.id, starting);
    return starting;
  }

  private async connect(browser: FoundBrowser): Promise<DrivenChromium> {
    const connection = await reachOrLaunch(browser, profileDir(browser, this.deps.userData));
    const { product } = await connection.send<{ product: string }>(CDP.Browser.getVersion);
    const driven = new DrivenChromium(browser, PRODUCT_VERSION.exec(product)?.[1] ?? null, connection, {
      sources: this.deps.sources,
      changed: () => this.changed(),
      closed: () => {
        this.driven.delete(browser.id);
        this.changed();
      },
    });
    this.driven.set(browser.id, driven);
    await driven.start();
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
