import type { WebContents } from 'electron';
import type { AppEvent } from '../../shared/types';
import { HTTP_SCHEME } from '../constants';
import { parseUrl } from '../parseUrl';
import type { PageController } from '../PageController';
import type { SessionStore } from '../store/SessionStore';
import { TITLE_SETTLE_MS } from './constants';

/**
 * Follows the page for the active workspace: remembers where it is, its title
 * once it settles, and its site's icon, and announces what the rail shows.
 */
export class PageFollower {
  /** Per workspace: switching mustn't drop the last title of the one left. */
  private readonly titleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly page: PageController,
    private readonly session: SessionStore,
    private readonly send: (event: AppEvent) => void,
  ) {}

  watch(wc: WebContents): void {
    wc.on('did-navigate', (_event, url) => this.pageShown(url));
    wc.on('did-navigate-in-page', (_event, url, isMainFrame) => isMainFrame && this.pageShown(url));
    wc.on('page-title-updated', (_event, title) => this.titleShown(wc.getURL(), title));
    wc.on('page-favicon-updated', (_event, favicons) => void this.faviconsFound(wc.getURL(), favicons));
  }

  private titleShown(pageUrl: string, title: string): void {
    // Not about:blank's (the page left as the workspace changes) or an error page's.
    if (!HTTP_SCHEME.test(pageUrl)) return;
    const id = this.session.activeId;
    clearTimeout(this.titleTimers.get(id));
    // Some pages keep changing their title (a clock, an unread count): it is kept once it settles.
    this.titleTimers.set(
      id,
      setTimeout(() => {
        this.titleTimers.delete(id);
        if (!this.session.has(id) || this.session.titleOf(id) === title.trim()) return;
        void this.session.setTitle(id, title).catch(() => undefined);
        this.pushState();
      }, TITLE_SETTLE_MS),
    );
  }

  private pageShown(url: string): void {
    const id = this.session.activeId;
    const host = parseUrl(this.session.urlOf(id))?.host;
    const hadIcon = !!this.session.favicon(id);
    void this.session.setUrl(url).catch(() => undefined);
    // The tile is labelled with the host, and loses the icon of a site it left.
    if (parseUrl(this.session.urlOf(id))?.host !== host) this.pushState();
    if (hadIcon && !this.session.favicon(id)) this.send({ type: 'workspace-favicon', id, favicon: null });
  }

  private async faviconsFound(pageUrl: string, candidates: string[]): Promise<void> {
    if (!HTTP_SCHEME.test(pageUrl)) return;
    // The workspace shown when the page reported it, whatever is shown by the time it has loaded.
    const id = this.session.activeId;
    const icon = await this.page.fetchFavicon(candidates).catch(() => null);
    // Nothing loaded (keep what there is), or the workspace moved on to another site meanwhile.
    if (!icon || parseUrl(this.session.urlOf(id))?.origin !== parseUrl(pageUrl)?.origin || this.session.favicon(id) === icon) return;
    await this.session.setFavicon(id, icon).catch(() => undefined);
    if (this.session.favicon(id) === icon) this.send({ type: 'workspace-favicon', id, favicon: icon });
  }

  private pushState(): void {
    this.send({ type: 'workspaces-changed', state: this.session.workspaces() });
  }
}
