import type { CaptureArea, DrivenBrowser } from '../../../shared/types';
import { HTTP_URL } from '../../constants';
import { CDP } from '../../engine/constants';
import { withTimeout } from '../../engine/PageInterception';
import type { CdpConnection } from '../../engine/websocketTransport';
import { captureOverCdp, type CapturedImage, type Viewport } from '../../shots/capture';
import type { FoundBrowser } from '../types';
import { attachTab } from './attachTab';
import { captureTabAt } from './captureTabAt';
import { NEW_TAB_TIMEOUT_MS, PAGE_ATTACH, PAGE_TARGET, START_URL, STOP_ATTACH } from './constants';
import { DrivenTabs } from './DrivenTabs';
import { letTargetGo } from './letTargetGo';
import { readTabInfos } from './readTabInfos';
import { releaseTab } from './releaseTab';
import { reloadTab } from './reloadTab';
import type { AttachedPage, DrivenChromiumDeps, DrivenTabState, PageTargetInfo } from './types';

/**
 * A Chromium browser the app launched, over its browser-level CDP connection: every tab is attached (a new one before
 * it loads anything) and served the workspace's overrides and rules by an interception of its own, the same engine as
 * the app's page. Tabs are listed with their address and title as they change.
 */
export class DrivenChromium {
  private readonly tabs = new DrivenTabs();
  private readonly disposers: Array<() => void> = [];

  constructor(
    readonly browser: FoundBrowser,
    private readonly version: string | null,
    private readonly connection: CdpConnection,
    private readonly deps: DrivenChromiumDeps,
  ) {}

  /** Attaches to the browser's tabs, the ones open now and every one opened later. */
  async start(): Promise<void> {
    const events: Partial<Record<string, (params: any) => void>> = {
      [CDP.Target.attachedToTarget]: (p: AttachedPage) => this.attached(p),
      [CDP.Target.detachedFromTarget]: (p: { sessionId: string }) => this.detached(p.sessionId),
      [CDP.Target.targetInfoChanged]: (p: { targetInfo: PageTargetInfo }) => this.tabs.update(p.targetInfo) && this.deps.changed(),
    };
    this.disposers.push(
      // The browser's own events carry no session; its tabs' go to their interceptions.
      this.connection.onEvent((method, params, sessionId) => {
        if (!sessionId) events[method]?.(params);
      }),
      this.connection.onClose(() => this.closed()),
    );
    await this.connection.send(CDP.Target.setDiscoverTargets, { discover: true });
    await this.connection.send(CDP.Target.setAutoAttach, { ...PAGE_ATTACH });
  }

  list(): DrivenBrowser {
    return { id: this.browser.id, name: this.browser.name, version: this.version, tabs: this.tabs.list() };
  }

  /**
   * Reads each tab's title and address again: a title a page sets isn't announced (only its address is), so it is
   * read once the page has loaded, and whenever the tabs are listed.
   */
  async readTabs(ids = this.tabs.list().map((t) => t.id)): Promise<void> {
    const infos = await readTabInfos(this.connection, ids);
    if (infos.filter((info) => this.tabs.update(info)).length) this.deps.changed();
  }

  /** Opens an address in the blank tab the browser started on, or else in a new tab, and brings it to the front. */
  async open(url: string): Promise<DrivenTabState> {
    const tab = this.tabs.blank() ?? (await this.newTab());
    // Taken: another address opened before this one shows isn't loaded in it too.
    tab.info = { ...tab.info, url };
    await tab.ready;
    await tab.transport.send(CDP.Page.navigate, { url });
    await this.activate(tab.info.id);
    return tab;
  }

  /** Captures the whole page at `url`, in the tab showing it (or one opened there), laid out in `viewport`. */
  async captureAt(url: string, viewport: Viewport): Promise<{ image: CapturedImage; url: string }> {
    const shown = this.tabs.showing(url);
    const tab = shown ?? (await this.open(url));
    if (shown) await this.activate(tab.info.id);
    return captureTabAt(tab, viewport);
  }

  /** Brings a tab to the front, in its window. */
  async activate(tabId: string): Promise<void> {
    this.tabs.get(tabId);
    await this.connection.send(CDP.Target.activateTarget, { targetId: tabId });
  }

  /** Captures a tab (brought to the front first: a hidden tab isn't drawn); with the address it showed. */
  async capture(tabId: string, area: Exclude<CaptureArea, 'element'>): Promise<{ image: CapturedImage; url: string }> {
    const tab = this.tabs.get(tabId);
    await this.activate(tabId);
    return { image: await captureOverCdp(tab.transport, { area }), url: tab.info.url };
  }

  /** After overrides or rules changed: what each tab intercepts. */
  async refresh(): Promise<void> {
    await Promise.all(this.tabs.all().map((t) => t.interception.refreshInterception().catch(() => undefined)));
  }

  /** After the settings changed: the cache, throttling and service workers they set, in each tab. */
  async applySettings(): Promise<void> {
    await Promise.all(this.tabs.all().map((t) => t.interception.applySettings().catch(() => undefined)));
  }

  /** Reloads the tabs showing a website, so what changed is served. */
  async reload(): Promise<void> {
    const pages = this.tabs.all().filter((t) => HTTP_URL.test(t.info.url));
    await Promise.all(pages.map((t) => reloadTab(t).catch(() => undefined)));
  }

  /** Stops serving the workspace's changes: the browser stays open, as it is. */
  stop(): void {
    for (const dispose of this.disposers.splice(0)) dispose();
    for (const tab of this.tabs.clear()) releaseTab(tab);
    this.connection.send(CDP.Target.setAutoAttach, { ...STOP_ATTACH }).catch(() => undefined);
    this.connection.close();
  }

  private attached(p: AttachedPage): void {
    // Only tabs are asked for; anything else is let go of as it came.
    if (p.targetInfo.type !== PAGE_TARGET) return letTargetGo(this.connection, p.sessionId);
    const tab = attachTab(this.connection, p, this.deps.sources);
    tab.transport.on(CDP.Page.loadEventFired, () => void this.readTabs([tab.info.id]));
    this.tabs.add(tab);
    this.deps.changed();
  }

  private detached(sessionId: string): void {
    const tab = this.tabs.remove(sessionId);
    if (!tab) return;
    releaseTab(tab);
    this.deps.changed();
  }

  private async newTab(): Promise<DrivenTabState> {
    const { targetId } = await this.connection.send<{ targetId: string }>(CDP.Target.createTarget, { url: START_URL });
    return withTimeout(this.tabs.arrival(targetId), NEW_TAB_TIMEOUT_MS, 'Opening a tab');
  }

  /** The browser was quit: its tabs are gone with it. */
  private closed(): void {
    for (const dispose of this.disposers.splice(0)) dispose();
    for (const tab of this.tabs.clear()) tab.interception.detach();
    this.deps.closed();
  }
}
