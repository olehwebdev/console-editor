import type { BrowserWindow, Session, WebContentsView } from 'electron';
import type { AppEvent, PageState } from '../../shared/types';
import { ConsoleService } from '../console';
import type { PageInterception } from '../engine/PageInterception';
import { PageWindow } from '../PageWindow';
import type { OverrideStore } from '../store/OverrideStore';
import type { PageWindowStore } from '../store/PageWindowStore';
import type { RuleStore } from '../store/RuleStore';
import type { SettingsStore } from '../store/SettingsStore';
import { attachDebugger } from './attachDebugger';
import { createPageView } from './createPageView';
import { fetchSiteFavicon } from './fetchSiteFavicon';
import { interceptPage } from './interceptPage';
import { openSiteSession } from './openSiteSession';
import { PageLoader } from './PageLoader';
import { pageState } from './pageState';
import { snapshotPage } from './snapshotPage';
import { watchLoading } from './watchLoading';
import { windowOpenHandler } from './windowOpenHandler';

/**
 * Owns the embedded browser view that shows the website, and the interception
 * engine attached to it through `webContents.debugger`.
 */
export class PageController {
  readonly view: WebContentsView;
  /** Where the page is shown: in the editor's window or in one of its own. */
  readonly window: PageWindow;
  /** The console of the page and its frames. */
  readonly console: ConsoleService;
  private readonly engine: PageInterception;
  private readonly siteSession: Session;
  private readonly loader: PageLoader;

  constructor(
    win: BrowserWindow,
    private readonly store: OverrideStore,
    private readonly rules: RuleStore,
    private readonly settings: SettingsStore,
    private readonly send: (event: AppEvent) => void,
    windowStore: PageWindowStore,
  ) {
    // Permission prompts and pop-ups go to the window showing the site.
    this.siteSession = openSiteSession(() => this.window.host);
    this.view = createPageView(win, this.siteSession);
    this.window = new PageWindow({ editor: win, view: this.view, store: windowStore, moved: () => this.pushState() });

    const wc = this.view.webContents;
    const transport = attachDebugger(wc, (reason) => {
      // Settle everything the engine is waiting on; nothing can be sent any more.
      this.engine.detach();
      this.send({ type: 'error', message: `Interception stopped: debugger detached (${reason})` });
    });

    this.console = new ConsoleService({ getSettings: () => this.settings.get(), send: (event) => this.send(event) });
    this.engine = interceptPage(transport, this.console, { store, rules, settings, send, siteSession: this.siteSession });
    this.loader = new PageLoader(wc, this.engine, () => this.pushState());

    // A page's "Leave site?" guard would silently cancel reloads after a save,
    // Back/Forward and typed URLs (Electron shows no dialog): the editor wins.
    wc.on('will-prevent-unload', (event) => event.preventDefault());
    wc.setWindowOpenHandler(windowOpenHandler(() => this.window.host, (url) => void this.navigate(url)));
    watchLoading(wc, () => this.pushState(), (event) => this.send(event));
  }

  attach(): Promise<void> {
    return this.loader.attach();
  }

  private pushState(): void {
    const state = this.state();
    this.send({ type: 'page-state', state });
    // The website's own window, if it has one, shows it too.
    this.window.showState(state);
  }

  state(): PageState {
    return pageState(this.view.webContents, this.window.detached);
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

  listResources() {
    return this.engine.listResources();
  }

  getResourceContent(url: string) {
    return this.engine.getResourceContent(url);
  }

  /** Call after overrides change. Pass `patterns: false` when only content changed. */
  async overridesChanged(patterns = true): Promise<void> {
    if (patterns) await this.engine.refreshInterception();
    this.send({ type: 'overrides-changed', overrides: this.store.metas() });
  }

  /** Call after rules change. Pass `patterns: false` when only header edits or request types changed (read at pause time). */
  async rulesChanged(patterns = true): Promise<void> {
    if (patterns) await this.engine.refreshInterception();
    this.send({ type: 'rules-changed', rules: this.rules.forRenderer() });
  }

  async settingsChanged(): Promise<void> {
    await Promise.all([this.engine.applySettings(), this.console.applySettings()]);
  }
}
