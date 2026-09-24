import { nativeImage, session, WebContentsView, type BrowserWindow, type Session } from 'electron';
import type { AppEvent, PageState, Rect } from '../../shared/types';
import { HTTP_SCHEME } from '../constants';
import { electronTransport } from '../electronTransport';
import { PageInterception } from '../engine/PageInterception';
import { loadFavicon } from '../favicon';
import { installSitePermissions } from '../sitePermissions';
import type { OverrideStore } from '../store/OverrideStore';
import type { SettingsStore } from '../store/SettingsStore';
import { chromeUserAgent } from './chromeUserAgent';
import { normalizeUrl } from './normalizeUrl';

/** Session partition for the site being edited: cookies/logins survive restarts. */
const SITE_PARTITION = 'persist:site';

/** The DevTools protocol version the engine speaks to the view's debugger. */
const CDP_VERSION = '1.3';

/** What the view shows before a site loads, and the URL it then reports (shown as none). */
const BLANK_PAGE = 'about:blank';

/** A browser's default page background, until the site paints its own. */
const PAGE_BACKGROUND = '#ffffff';

/** Chromium's net error for a navigation replaced by another one, not a real failure. */
const ERR_ABORTED = -3;
/** The same error in a rejected `loadURL`, whose message names it rather than giving its code. */
const ERR_ABORTED_MESSAGE = /ERR_ABORTED/;
/** Fetches a live file past the HTTP cache. */
const BYPASS_CACHE = { 'Cache-Control': 'no-cache' } as const;

/** Quality of the page snapshot shown under overlays. */
const SNAPSHOT_JPEG_QUALITY = 85;

/** The longest side, in pixels, of a site icon kept for its workspace. */
const FAVICON_SIZE = 32;

/**
 * Owns the embedded browser view that shows the website, and the interception
 * engine attached to it through `webContents.debugger`.
 */
export class PageController {
  readonly view: WebContentsView;
  private readonly engine: PageInterception;
  private readonly siteSession: Session;
  private ready: Promise<void> = Promise.resolve();

  constructor(
    win: BrowserWindow,
    private readonly store: OverrideStore,
    private readonly settings: SettingsStore,
    private readonly send: (event: AppEvent) => void,
  ) {
    this.siteSession = session.fromPartition(SITE_PARTITION);
    this.siteSession.setUserAgent(chromeUserAgent(this.siteSession.getUserAgent()));
    installSitePermissions(this.siteSession, win);

    this.view = new WebContentsView({
      webPreferences: { session: this.siteSession, contextIsolation: true, sandbox: true },
    });
    this.view.setBackgroundColor(PAGE_BACKGROUND);
    win.contentView.addChildView(this.view);
    this.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });

    const wc = this.view.webContents;
    wc.debugger.attach(CDP_VERSION);
    const transport = electronTransport(wc.debugger);
    wc.debugger.on('detach', (_event, reason) => {
      // Settle everything the engine is waiting on; nothing can be sent any more.
      this.engine.detach();
      this.send({ type: 'error', message: `Interception stopped: debugger detached (${reason})` });
    });

    this.engine = new PageInterception({
      transport,
      getOverrides: () => this.store.list(),
      getSettings: () => this.settings.get(),
      emit: (event) => this.send(event),
      fallbackFetch: async (url) => {
        const res = await this.siteSession.fetch(url, { credentials: 'include', headers: BYPASS_CACHE });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return res.text();
      },
    });

    // A page's "Leave site?" guard would silently cancel reloads after a save,
    // Back/Forward and typed URLs (Electron shows no dialog): the editor wins.
    wc.on('will-prevent-unload', (event) => event.preventDefault());
    // Real pop-ups (sign-in flows rely on window.opener) open as child windows;
    // links meant for a new tab load here, where overrides apply.
    wc.setWindowOpenHandler(({ url, disposition }) => {
      if (disposition === 'new-window') {
        return { action: 'allow', overrideBrowserWindowOptions: { parent: win, autoHideMenuBar: true } };
      }
      if (HTTP_SCHEME.test(url)) void this.navigate(url);
      return { action: 'deny' };
    });

    const pushState = () => this.pushState();
    wc.on('did-start-loading', pushState);
    wc.on('did-stop-loading', pushState);
    wc.on('did-navigate', pushState);
    wc.on('did-navigate-in-page', pushState);
    wc.on('page-title-updated', pushState);
    wc.on('did-fail-load', (_e, code, description, url, isMainFrame) => {
      if (isMainFrame && code !== ERR_ABORTED) this.send({ type: 'error', message: `Failed to load ${url}: ${description} (${code})` });
    });
  }

  attach(): Promise<void> {
    this.ready = (async () => {
      // Renderer-side CDP commands (Page.enable, Network.enable…) never answer until
      // the view has a renderer, so give it an empty document first.
      await this.view.webContents.loadURL(BLANK_PAGE);
      await this.engine.attach();
    })();
    return this.ready;
  }

  private pushState(): void {
    this.send({ type: 'page-state', state: this.state() });
  }

  state(): PageState {
    const wc = this.view.webContents;
    const url = wc.getURL();
    return {
      url: url === BLANK_PAGE ? '' : url,
      title: url === BLANK_PAGE ? '' : wc.getTitle(),
      loading: wc.isLoading(),
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
    };
  }

  /** Loads `input`. With `fresh`, what came before it is dropped from Back once it has loaded (a workspace's page). */
  async navigate(input: string, { fresh = false } = {}): Promise<void> {
    const url = normalizeUrl(input);
    // Never load a site before interception is set up, or overrides would be missed.
    await this.ready;
    await this.engine.prepareReload();
    try {
      await this.view.webContents.loadURL(url);
    } catch (err) {
      // Failures are reported through 'did-fail-load'.
      if (!ERR_ABORTED_MESSAGE.test(String(err))) console.warn(`loadURL(${url}) failed:`, err);
    }
    if (fresh) this.clearHistory();
  }

  /**
   * Leaves the page for an empty one with no history, as the workspace shown
   * changes: the page's unload runs, and nothing it does afterwards (an
   * in-page navigation, a new favicon) is taken for the next workspace's.
   */
  async leave(): Promise<void> {
    await this.ready;
    await this.view.webContents.loadURL(BLANK_PAGE).catch(() => undefined);
    this.clearHistory();
  }

  private clearHistory(): void {
    this.view.webContents.navigationHistory.clear();
    // Back/Forward changed without a navigation event.
    this.pushState();
  }

  /** The site's icon as a small data URL, from the candidates in `page-favicon-updated`; null if none loads. */
  fetchFavicon(candidates: string[]): Promise<string | null> {
    return loadFavicon(candidates, {
      // Through the site's session, like the page's own request for it (an intranet site may want its cookies).
      fetch: (url) => this.siteSession.fetch(url, { credentials: 'include' }),
      shrink: (bytes) => {
        const image = nativeImage.createFromBuffer(bytes);
        if (image.isEmpty()) return null;
        const { width, height } = image.getSize();
        const small =
          Math.max(width, height) > FAVICON_SIZE
            ? image.resize(width >= height ? { width: FAVICON_SIZE, quality: 'best' } : { height: FAVICON_SIZE, quality: 'best' })
            : image;
        return small.toDataURL();
      },
    });
  }

  /** Reloads the page, first asking service workers that run outdated code to unregister (see `prepareReload`). */
  async reload(): Promise<void> {
    await this.engine.prepareReload();
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
    try {
      const image = await this.view.webContents.capturePage();
      return image.isEmpty() ? null : `data:image/jpeg;base64,${image.toJPEG(SNAPSHOT_JPEG_QUALITY).toString('base64')}`;
    } catch {
      // Some GPU setups can't read the surface back; the renderer shows a plain panel instead.
      return null;
    }
  }

  openDevTools(): void {
    this.view.webContents.openDevTools({ mode: 'detach' });
  }

  setBounds(rect: Rect): void {
    this.view.setBounds({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.max(0, Math.round(rect.width)),
      height: Math.max(0, Math.round(rect.height)),
    });
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

  settingsChanged(): Promise<void> {
    return this.engine.applySettings();
  }
}
