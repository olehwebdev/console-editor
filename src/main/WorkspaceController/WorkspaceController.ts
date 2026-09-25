import type { WebContents } from 'electron';
import type { AppEvent, Workspace, WorkspacePatch } from '../../shared/types';
import type { PageController } from '../PageController';
import type { ActionStore } from '../store/ActionStore';
import type { OverrideStore } from '../store/OverrideStore';
import type { RuleStore } from '../store/RuleStore';
import type { SessionStore } from '../store/SessionStore';
import { PageFollower } from './PageFollower';

/**
 * Workspaces: each has its own page, tabs (kept by the renderer through the
 * session store), overrides, rules and actions. Switching leaves the page,
 * makes the other workspace's overrides and rules the ones applied and its
 * actions the ones listed, and loads its last page.
 */
export class WorkspaceController {
  /** Switches and deletions run one at a time. */
  private queue: Promise<unknown> = Promise.resolve();
  private readonly follower: PageFollower;

  constructor(
    private readonly page: PageController,
    private readonly session: SessionStore,
    private readonly store: OverrideStore,
    private readonly rules: RuleStore,
    private readonly actions: ActionStore,
    private readonly send: (event: AppEvent) => void,
  ) {
    this.follower = new PageFollower(page, session, send);
  }

  /**
   * Serves the active workspace's overrides, applies its rules and lists its
   * actions, handing it any overrides and rules that belong to no workspace
   * (overrides saved before workspaces existed, or those of a workspace that was lost).
   */
  async start(): Promise<void> {
    const known = new Set(this.session.workspaces().workspaces.map((w) => w.id));
    const { activeId } = this.session;
    await this.store.adopt(known, activeId);
    await this.rules.adopt(known, activeId);
    this.store.setWorkspace(activeId);
    this.rules.setWorkspace(activeId);
    this.actions.setWorkspace(activeId);
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

  /** Deletes a workspace other than the active one, with its actions, overrides and rules. */
  remove(id: unknown): Promise<void> {
    return this.serialize(async () => {
      if (!this.session.has(id)) throw new Error('Unknown workspace');
      if (id === this.session.activeId) throw new Error('The workspace in use cannot be deleted');
      // What it owns goes first: were the workspace to go first and a deletion fail, the next
      // start would hand its overrides and rules to another workspace.
      await this.actions.removeWorkspace(id as string);
      await this.store.removeWorkspace(id as string);
      await this.rules.removeWorkspace(id as string);
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
      // All together, before anything awaits: no request is ever served one workspace's overrides and another's rules.
      this.store.setWorkspace(this.session.activeId);
      this.rules.setWorkspace(this.session.activeId);
      this.actions.setWorkspace(this.session.activeId);
      // One pattern refresh reads both stores; the rules then only need their event.
      await this.page.overridesChanged();
      await this.page.rulesChanged(false);
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
