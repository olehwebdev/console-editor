import type { CaptureArea } from '../../../../shared/types';
import { BIDI, BidiInterception, type BidiConnection } from '../../../engine/bidi';
import { withTimeout } from '../../../engine/PageInterception';
import type { CapturedImage, Viewport } from '../../../shots/capture';
import type { FoundBrowser } from '../../types';
import { LOAD_TIMEOUT_MS, START_URL } from '../constants';
import { DrivenBase } from '../DrivenBase';
import type { Driver, DriverDeps, KeptTab, TabCapture, TabRead } from '../types';
import { captureContext } from './captureContext';
import { captureContextAt } from './captureContextAt';
import { NAVIGATE_WAIT, TAB_TYPE } from './constants';
import { readFirefoxTabs } from './readFirefoxTabs';
import type { ContextInfo } from './types';

/**
 * Firefox, launched by the app, over its WebDriver BiDi session: the workspace's overrides and rules served in every
 * tab by one interception (see {@link BidiInterception}), and its tabs (top-level browsing contexts) listed with their
 * address and title as they change.
 */
export class DrivenFirefox extends DrivenBase<KeptTab> implements Driver {
  private readonly interception: BidiInterception;

  constructor(
    browser: FoundBrowser,
    version: string | null,
    private readonly connection: BidiConnection,
    deps: DriverDeps,
  ) {
    super(browser, version, deps);
    const { store, rules, settings } = deps.sources;
    this.interception = new BidiInterception(connection, { getOverrides: () => store.list(), getRules: () => rules.list(), getSettings: () => settings.get() });
  }

  async start(): Promise<void> {
    const moved = (p: ContextInfo) => this.tabs.update(p.context, { url: p.url }) && this.deps.changed();
    const events: Partial<Record<string, (params: any) => void>> = {
      [BIDI.browsingContext.contextCreated]: (p: ContextInfo) => !p.parent && this.found(p.context, p.url),
      [BIDI.browsingContext.contextDestroyed]: (p: ContextInfo) => !p.parent && this.tabs.remove(p.context) && this.deps.changed(),
      [BIDI.browsingContext.navigationStarted]: moved,
      [BIDI.browsingContext.fragmentNavigated]: moved,
      [BIDI.browsingContext.historyUpdated]: moved,
      // A title a page sets isn't reported: it is read once the page has loaded.
      [BIDI.browsingContext.load]: (p: ContextInfo) => void this.readTabs([p.context]),
    };
    this.disposers.push(
      this.connection.onEvent((method, params) => events[method]?.(params)),
      this.connection.onClose(() => this.closed()),
    );
    await this.connection.send(BIDI.session.subscribe, { events: Object.keys(events) });
    await this.interception.start();
    const { contexts } = await this.connection.send<{ contexts: ContextInfo[] }>(BIDI.browsingContext.getTree, { maxDepth: 0 });
    for (const context of contexts) this.found(context.context, context.url);
    await this.readTabs();
  }

  open(url: string): Promise<KeptTab> {
    return this.load(url, NAVIGATE_WAIT.none);
  }

  async activate(tabId: string): Promise<void> {
    this.tabs.get(tabId);
    await this.connection.send(BIDI.browsingContext.activate, { context: tabId });
  }

  async captureAt(url: string, viewport: Viewport): Promise<TabCapture> {
    const shown = this.tabs.showing(url);
    const tab = shown ?? (await withTimeout(this.load(url, NAVIGATE_WAIT.loaded), LOAD_TIMEOUT_MS, 'Loading the page'));
    if (shown) await this.activate(tab.info.id);
    return { image: await captureContextAt(this.connection, tab.info.id, viewport), url: tab.info.url };
  }

  refresh(): Promise<void> {
    return this.interception.refresh();
  }

  applySettings(): Promise<void> {
    return this.interception.applySettings();
  }

  async reload(): Promise<void> {
    await Promise.all(this.tabs.webPages().map((t) => this.connection.send(BIDI.browsingContext.reload, { context: t.info.id, wait: NAVIGATE_WAIT.none }).catch(() => undefined)));
  }

  stop(): void {
    this.dispose();
    this.interception.stop();
    this.tabs.clear();
    this.connection.send(BIDI.session.end).catch(() => undefined);
    this.connection.close();
  }

  protected read(ids: string[]): Promise<TabRead[]> {
    return readFirefoxTabs(this.connection, ids);
  }

  protected take(tab: KeptTab, area: Exclude<CaptureArea, 'element'>): Promise<CapturedImage> {
    return captureContext(this.connection, tab.info.id, area);
  }

  /** Loads an address in the blank tab the browser started on, or else in a new tab, and brings it to the front. */
  private async load(url: string, wait: string): Promise<KeptTab> {
    const tab = this.tabs.blank() ?? (await this.newTab());
    // Taken: another address opened before this one shows isn't loaded in it too.
    tab.info = { ...tab.info, url };
    await this.connection.send(BIDI.browsingContext.navigate, { context: tab.info.id, url, wait });
    await this.activate(tab.info.id);
    return tab;
  }

  private async newTab(): Promise<KeptTab> {
    const { context } = await this.connection.send<{ context: string }>(BIDI.browsingContext.create, { type: TAB_TYPE });
    this.found(context, START_URL);
    return this.tabs.get(context);
  }

  private found(id: string, url: string): void {
    if (this.tabs.has(id)) return;
    this.tabs.add({ info: { id, title: '', url } });
    this.deps.changed();
  }

  /** The browser was quit: its tabs are gone with it. */
  private closed(): void {
    this.dispose();
    this.tabs.clear();
    this.deps.closed();
  }
}
