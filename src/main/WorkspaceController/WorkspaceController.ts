import type { WebContents } from 'electron';
import type { AppEvent, Workspace, WorkspacePatch } from '../../shared/types';
import type { PageController } from '../PageController';
import type { ActionStore } from '../store/ActionStore';
import type { OverrideStore } from '../store/OverrideStore';
import type { SessionStore } from '../store/SessionStore';
import { PageFollower } from './PageFollower';

/**
 * Workspaces: each has its own page, tabs (kept by the renderer through the
 * session store), overrides and actions. Switching leaves the page, makes the
 * other workspace's overrides the ones served and its actions the ones listed,
 * and loads its last page.
 */
export class WorkspaceController {
  /** Switches and deletions run one at a time. */
  private queue: Promise<unknown> = Promise.resolve();
  private readonly follower: PageFollower;

  constructor(
    private readonly page: PageController,
    private readonly session: SessionStore,
    private readonly store: OverrideStore,
    private readonly actions: ActionStore,
    private readonly send: (event: AppEvent) => void,
  ) {
    this.follower = new PageFollower(page, session, send);
  }

  /**
   * Serves the active workspace's overrides, handing it any that belong to no
   * workspace (those saved before workspaces existed), and lists its actions.
   */
  async start(): Promise<void> {
    await this.store.adopt(new Set(this.session.workspaces().workspaces.map((w) => w.id)), this.session.activeId);
    this.store.setWorkspace(this.session.activeId);
    this.actions.setWorkspace(this.session.activeId);
  }

  /** Follows the page: remembers where the active workspace is, and its site's icon. */
  watch(wc: WebContents): void {
    this.follower.watch(wc);
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

  /** Deletes a workspace other than the active one, with its actions and overrides. */
  remove(id: unknown): Promise<void> {
    return this.serialize(async () => {
      if (!this.session.has(id)) throw new Error('Unknown workspace');
      if (id === this.session.activeId) throw new Error('The workspace in use cannot be deleted');
      // What it owns goes first: were the workspace to go first and this fail, its overrides would be handed to another at the next start.
      await this.actions.removeWorkspace(id as string);
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
      this.actions.setWorkspace(this.session.activeId);
      await this.page.overridesChanged();
      this.send({ type: 'actions-changed', actions: this.actions.list() });
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
