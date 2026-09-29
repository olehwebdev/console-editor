import type { Page, Route } from 'playwright-core';
import type { CaptureArea } from '../../../../shared/types';
import { answerContext, type AnswerContext } from '../../../engine/answering';
import { withTimeout } from '../../../engine/PageInterception';
import type { CapturedImage, Viewport } from '../../../shots/capture';
import type { FoundBrowser } from '../../types';
import { LOAD_TIMEOUT_MS } from '../constants';
import { DrivenBase } from '../DrivenBase';
import type { Driver, DriverDeps, TabRead } from '../types';
import { answerRoute } from './answerRoute';
import { capturePage } from './capturePage';
import { capturePageAt } from './capturePageAt';
import { ALL_URLS, TAB_ID_PREFIX, WAIT } from './constants';
import { PlaywrightDesigns } from './PlaywrightDesigns';
import type { PlaywrightSession, PlaywrightTab } from './types';

/**
 * A browser launched through Playwright (WebKit's build): the workspace's overrides and rules served in each of its
 * tabs through `route` (every request, its body included), its tabs listed with their address and title. It can't
 * outlive the app's hold on it: letting go of it quits it, keeping its cookies and storage for next time.
 */
export class DrivenPlaywright extends DrivenBase<PlaywrightTab> implements Driver {
  protected readonly designs: PlaywrightDesigns;
  private readonly ctx: AnswerContext;
  private readonly ids = new WeakMap<Page, string>();
  private count = 0;
  // A request the answering failed on (its tab went away) is sent on, if it still can be.
  private readonly answer = (route: Route) => answerRoute(this.ctx, route).catch(() => route.continue().catch(() => undefined));

  constructor(
    browser: FoundBrowser,
    private readonly session: PlaywrightSession,
    deps: DriverDeps,
  ) {
    super(browser, session.browser.version(), deps);
    const { store, rules, settings } = deps.sources;
    this.ctx = answerContext({ getOverrides: () => store.list(), getRules: () => rules.list(), getSettings: () => settings.get() });
    this.designs = new PlaywrightDesigns(session.context);
  }

  async start(): Promise<void> {
    const { browser, context } = this.session;
    const found = (page: Page) => void this.found(page);
    const quit = () => this.closed();
    context.on('page', found);
    browser.on('disconnected', quit);
    this.disposers.push(
      () => context.off('page', found),
      () => browser.off('disconnected', quit),
    );
    await context.route(ALL_URLS, this.answer);
    for (const page of context.pages()) this.found(page);
  }

  open(url: string): Promise<PlaywrightTab> {
    return this.load(url, WAIT.started);
  }

  async activate(tabId: string): Promise<void> {
    await this.tabs.get(tabId).page.bringToFront();
  }

  async refresh(): Promise<void> {
    this.ctx.overrides.clear();
    this.ctx.matchers.clear();
  }

  async applySettings(): Promise<void> {
    // Every request is routed, which keeps the browser's cache out of the way whatever the settings say.
  }

  async reload(): Promise<void> {
    await Promise.all(this.tabs.webPages().map((t) => t.page.reload({ waitUntil: WAIT.started }).catch(() => undefined)));
  }

  stop(): void {
    this.dispose();
    this.tabs.clear();
    const { browser, context, stateFile } = this.session;
    void context
      .storageState({ path: stateFile })
      .catch(() => undefined)
      .then(() => browser.close())
      .catch(() => undefined);
  }

  protected async read(ids: string[]): Promise<TabRead[]> {
    const pages = ids.flatMap((id) => (this.tabs.has(id) ? [{ id, page: this.tabs.get(id).page }] : []));
    return Promise.all(pages.map(async ({ id, page }) => ({ id, url: page.url(), title: await page.title().catch(() => undefined) })));
  }

  protected take(tab: PlaywrightTab, area: Exclude<CaptureArea, 'element'>): Promise<CapturedImage> {
    return capturePage(tab.page, area);
  }

  protected openLoaded(url: string): Promise<PlaywrightTab> {
    return withTimeout(this.load(url, WAIT.loaded), LOAD_TIMEOUT_MS, 'Loading the page');
  }

  protected takeAt(tab: PlaywrightTab, viewport: Viewport): Promise<CapturedImage> {
    return capturePageAt(this.session, this.answer, tab.info.url, viewport);
  }

  /** Loads an address in a blank tab, or else in a new one, and brings it to the front. */
  private async load(url: string, waitUntil: (typeof WAIT)[keyof typeof WAIT]): Promise<PlaywrightTab> {
    const tab = this.tabs.blank() ?? this.found(await this.session.context.newPage());
    // Taken: another address opened before this one shows isn't loaded in it too.
    tab.info = { ...tab.info, url };
    await tab.page.goto(url, { waitUntil });
    await tab.page.bringToFront();
    return tab;
  }

  private found(page: Page): PlaywrightTab {
    const known = this.ids.get(page);
    if (known) return this.tabs.get(known);
    const id = `${TAB_ID_PREFIX}${++this.count}`;
    this.ids.set(page, id);
    const tab = { info: { id, title: '', url: page.url() }, page };
    this.tabs.add(tab);
    page.on('framenavigated', (frame) => frame === page.mainFrame() && this.tabs.update(id, { url: frame.url() }) && this.deps.changed());
    // A title a page sets isn't announced: it is read once the page has loaded.
    page.on('load', () => void this.readTabs([id]).catch(() => undefined));
    page.on('close', () => {
      const gone = this.tabs.remove(id);
      if (gone) this.designs.gone(gone);
      this.deps.changed();
    });
    this.deps.changed();
    void this.designs.found(tab);
    return tab;
  }

  /** The browser was quit: its tabs are gone with it. */
  private closed(): void {
    this.dispose();
    this.tabs.clear();
    this.deps.closed();
  }
}
