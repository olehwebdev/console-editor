import type { BrowserWindow, Session, WebContentsView } from 'electron';
import type { AppEvent, PageState, Rect, SourceMapFile, SourceMapRequest } from '../../shared/types';
import { ConsoleService } from '../console';
import { PageInterception } from '../engine/PageInterception';
import type { OverrideStore } from '../store/OverrideStore';
import type { SettingsStore } from '../store/SettingsStore';
import { attachDebugger } from './attachDebugger';
import { createPageView } from './createPageView';
import { fetchSiteFavicon } from './fetchSiteFavicon';
import { fetchUncached } from './fetchUncached';
import { loadSiteSourceMap } from './loadSiteSourceMap';
import { openSiteSession } from './openSiteSession';
import { PageLoader } from './PageLoader';
import { pageState } from './pageState';
import { snapshotPage } from './snapshotPage';
import { toViewBounds } from './toViewBounds';
import { watchLoading } from './watchLoading';
import { windowOpenHandler } from './windowOpenHandler';

/**
 * Owns the embedded browser view that shows the website, and the interception
 * engine attached to it through `webContents.debugger`.
 */
export class PageController {
  readonly view: WebContentsView;
  /** The console of the page and its frames. */
  readonly console: ConsoleService;
  private readonly engine: PageInterception;
  private readonly siteSession: Session;
  private readonly loader: PageLoader;

  constructor(
    win: BrowserWindow,
    private readonly store: OverrideStore,
    private readonly settings: SettingsStore,
    private readonly send: (event: AppEvent) => void,
  ) {
    this.siteSession = openSiteSession(win);
    this.view = createPageView(win, this.siteSession);

    const wc = this.view.webContents;
    const transport = attachDebugger(wc, (reason) => {
      // Settle everything the engine is waiting on; nothing can be sent any more.
      this.engine.detach();
      this.send({ type: 'error', message: `Interception stopped: debugger detached (${reason})` });
    });

    this.console = new ConsoleService({ getSettings: () => this.settings.get(), send: (event) => this.send(event) });
    this.engine = new PageInterception({
      transport,
      sessions: this.console,
      getOverrides: () => this.store.list(),
      getSettings: () => this.settings.get(),
      emit: (event) => this.send(event),
      fallbackFetch: (url) => fetchUncached(this.siteSession, url),
    });
    this.loader = new PageLoader(wc, this.engine, () => this.pushState());

    // A page's "Leave site?" guard would silently cancel reloads after a save,
    // Back/Forward and typed URLs (Electron shows no dialog): the editor wins.
    wc.on('will-prevent-unload', (event) => event.preventDefault());
    wc.setWindowOpenHandler(windowOpenHandler(win, (url) => void this.navigate(url)));
    watchLoading(wc, () => this.pushState(), (event) => this.send(event));
  }

  attach(): Promise<void> {
    return this.loader.attach();
  }

  private pushState(): void {
    this.send({ type: 'page-state', state: this.state() });
  }

  state(): PageState {
    return pageState(this.view.webContents);
  }

  /** Loads `input`. With `fresh`, what came before it is dropped from Back once it has loaded (a workspace's page). */
  navigate(input: string, { fresh = false } = {}): Promise<void> {
    return this.loader.navigate(input, fresh);
  }

  /**
   * Leaves the page for an empty one with no history, as the workspace shown
   * changes: the page's unload runs, and nothing it does afterwards (an
   * in-page navigation, a new favicon) is taken for the next workspace's.
   */
  leave(): Promise<void> {
    return this.loader.leave();
  }

  /** The site's icon as a small data URL, from the candidates in `page-favicon-updated`; null if none loads. */
  fetchFavicon(candidates: string[]): Promise<string | null> {
    return fetchSiteFavicon(this.siteSession, candidates);
  }

  /** Reloads the page, first asking service workers that run outdated code to unregister (see `prepareReload`). */
  async reload(): Promise<void> {
    await this.engine.prepareReload(this.view.webContents.getURL());
    this.view.webContents.reloadIgnoringCache();
  }

  goBack(): void {
    if (this.view.webContents.navigationHistory.canGoBack()) this.view.webContents.navigationHistory.goBack();
  }

  goForward(): void {
    if (this.view.webContents.navigationHistory.canGoForward()) this.view.webContents.navigationHistory.goForward();
  }

  /** JPEG snapshot of the page (for the renderer to show while an overlay covers the view). */
  async capture(): Promise<string | null> {
    if (!this.state().url || this.view.getBounds().width === 0) return null;
    return snapshotPage(this.view.webContents);
  }

  openDevTools(): void {
    this.view.webContents.openDevTools({ mode: 'detach' });
  }

  setBounds(rect: Rect): void {
    this.view.setBounds(toViewBounds(rect));
  }

  listResources() {
    return this.engine.listResources();
  }

  getResourceContent(url: string) {
    return this.engine.getResourceContent(url);
  }

  /** A listed script's or stylesheet's source map (SPEC §6.7). */
  getSourceMap(request: SourceMapRequest): Promise<SourceMapFile> {
    return loadSiteSourceMap(request, this.siteSession, (url) => this.engine.getResourceContent(url), this.view.webContents.getURL());
  }

  /** Call after overrides change. Pass `patterns: false` when only content changed. */
  async overridesChanged(patterns = true): Promise<void> {
    if (patterns) await this.engine.refreshInterception();
    this.send({ type: 'overrides-changed', overrides: this.store.metas() });
  }

  async settingsChanged(): Promise<void> {
    await Promise.all([this.engine.applySettings(), this.console.applySettings()]);
  }
}
