import type { WebContents } from 'electron';
import type { AppEvent, Workspace, WorkspacePatch } from '../shared/types';
import { HTTP_SCHEME } from './constants';
import { parseUrl } from './parseUrl';
import type { PageController } from './PageController';
import type { OverrideStore } from './store/OverrideStore';
import type { SessionStore } from './store/SessionStore';

/** A page title is kept once it has stayed this long. */
const TITLE_SETTLE_MS = 1000;

/**
 * Workspaces: each has its own page, tabs (kept by the renderer through the
 * session store) and overrides. Switching leaves the page, makes the other
 * workspace's overrides the ones served, and loads its last page.
 */
export class WorkspaceController {
  /** Switches and deletions run one at a time. */
  private queue: Promise<unknown> = Promise.resolve();
  /** Per workspace: switching mustn't drop the last title of the one left. */
  private readonly titleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly page: PageController,
    private readonly session: SessionStore,
    private readonly store: OverrideStore,
    private readonly send: (event: AppEvent) => void,
  ) {}

  /**
   * Serves the active workspace's overrides, handing it any that belong to no
   * workspace (those saved before workspaces existed).
   */
  async start(): Promise<void> {
    await this.store.adopt(new Set(this.session.workspaces().workspaces.map((w) => w.id)), this.session.activeId);
    this.store.setWorkspace(this.session.activeId);
  }

  /** Follows the page: remembers where the active workspace is, and its site's icon. */
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

  state() {
    return this.session.workspaces();
  }

  favicons() {
    return this.session.allFavicons();
  }

  async create(): Promise<Workspace> {
    const created = await this.session.create();
    this.pushState();
    return created;
  }

  async update(id: unknown, patch: WorkspacePatch): Promise<Workspace> {
    const updated = await this.session.update(id, patch);
    this.pushState();
    return updated;
  }

  /** Deletes a workspace other than the active one, with its overrides. */
  remove(id: unknown): Promise<void> {
    return this.serialize(async () => {
      if (!this.session.has(id)) throw new Error('Unknown workspace');
      if (id === this.session.activeId) throw new Error('The workspace in use cannot be deleted');
      // Its overrides go first: were the workspace to go first and this fail, the next start would hand them to another.
      await this.store.removeWorkspace(id as string);
      await this.session.remove(id);
      this.pushState();
    });
  }

  /** Makes `id` the active workspace. The renderer has closed the tabs of the one it leaves. */
  switchTo(id: unknown): Promise<void> {
    return this.serialize(async () => {
      if (!this.session.has(id)) throw new Error('Unknown workspace');
      if (id === this.session.activeId) return;
      // The page leaves first: until it has, what it does is the old workspace's.
      await this.page.leave();
      // In memory at once, written after: a failed write is reported, but the switch is whole.
      const saved = this.session.setActive(id);
      this.store.setWorkspace(this.session.activeId);
      await this.page.overridesChanged();
      this.pushState();
      const { url } = this.session.get();
      if (url) void this.page.navigate(url, { fresh: true });
      await saved;
    });
  }

  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }
}
