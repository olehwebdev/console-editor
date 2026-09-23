import { session, WebContentsView, type BrowserWindow, type Session } from 'electron';
import type { AppEvent, PageState, Rect } from '../shared/types';
import { electronTransport } from './electronTransport';
import { InterceptionEngine } from './engine/InterceptionEngine';
import type { OverrideStore } from './store/OverrideStore';
import type { SettingsStore } from './store/SettingsStore';

/** Session partition for the site being edited: cookies/logins survive restarts. */
const SITE_PARTITION = 'persist:site';

/** Adds a scheme to what the user typed in the address bar. */
export function normalizeUrl(input: string): string {
  const text = input.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[\w.-]+:\d+/.test(text)) return text;
  if (/^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(text) || /^[\w.-]+:\d+(\/|$)/.test(text)) {
    return `http://${text}`;
  }
  return `https://${text}`;
}

/**
 * Some sites (and Google sign-in) treat embedded browsers differently; drop the
 * Electron/app tokens so the page sees a regular Chrome user agent.
 */
function chromeUserAgent(ua: string): string {
  return ua.replace(/\s(Electron|console-editor|Console Editor)\/\S+/gi, '');
}

/**
 * Owns the embedded browser view that shows the website, and the interception
 * engine attached to it through `webContents.debugger`.
 */
export class PageController {
  readonly view: WebContentsView;
  private readonly engine: InterceptionEngine;
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

    this.view = new WebContentsView({
      webPreferences: { session: this.siteSession, contextIsolation: true, sandbox: true },
    });
    this.view.setBackgroundColor('#ffffff');
    win.contentView.addChildView(this.view);
    this.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });

    const wc = this.view.webContents;
    wc.debugger.attach('1.3');
    const transport = electronTransport(wc.debugger);
    wc.debugger.on('detach', (_event, reason) => {
      this.send({ type: 'error', message: `Interception stopped: debugger detached (${reason})` });
    });

    this.engine = new InterceptionEngine({
      transport,
      getOverrides: () => this.store.list(),
      getSettings: () => this.settings.get(),
      emit: (event) => this.send(event),
      fallbackFetch: async (url) => {
        const res = await this.siteSession.fetch(url, { credentials: 'include', headers: { 'Cache-Control': 'no-cache' } });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return res.text();
      },
    });

    const pushState = () => this.send({ type: 'page-state', state: this.state() });
    wc.on('did-start-loading', pushState);
    wc.on('did-stop-loading', pushState);
    wc.on('did-navigate', pushState);
    wc.on('did-navigate-in-page', pushState);
    wc.on('page-title-updated', pushState);
    wc.on('did-fail-load', (_e, code, description, url, isMainFrame) => {
      // -3 is ERR_ABORTED: a navigation replaced by another one, not a real failure.
      if (isMainFrame && code !== -3) this.send({ type: 'error', message: `Failed to load ${url}: ${description} (${code})` });
    });
  }

  attach(): Promise<void> {
    this.ready = (async () => {
      // Renderer-side CDP commands (Page.enable, Network.enable…) never answer until
      // the view has a renderer, so give it an empty document first.
      await this.view.webContents.loadURL('about:blank');
      await this.engine.attach();
    })();
    return this.ready;
  }

  state(): PageState {
    const wc = this.view.webContents;
    const url = wc.getURL();
    return {
      url: url === 'about:blank' ? '' : url,
      title: url === 'about:blank' ? '' : wc.getTitle(),
      loading: wc.isLoading(),
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
    };
  }

  async navigate(input: string): Promise<void> {
    const url = normalizeUrl(input);
    // Never load a site before interception is set up, or overrides would be missed.
    await this.ready;
    try {
      await this.view.webContents.loadURL(url);
    } catch (err) {
      // Failures are reported through 'did-fail-load'.
      if (!/ERR_ABORTED/.test(String(err))) console.warn(`loadURL(${url}) failed:`, err);
    }
  }

  reload(): void {
    this.view.webContents.reloadIgnoringCache();
  }

  goBack(): void {
    if (this.view.webContents.navigationHistory.canGoBack()) this.view.webContents.navigationHistory.goBack();
  }

  goForward(): void {
    if (this.view.webContents.navigationHistory.canGoForward()) this.view.webContents.navigationHistory.goForward();
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
