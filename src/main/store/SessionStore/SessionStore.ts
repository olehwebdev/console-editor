import { join } from 'node:path';
import type { SessionDraft, SessionState, Workspace, WorkspacePatch, WorkspacesState } from '../../../shared/types';
import { WriteQueue } from '../WriteQueue';
import { DRAFTS_DIR, FAVICONS_DIR } from './constants';
import { DraftFiles } from './DraftFiles';
import { FaviconFiles } from './FaviconFiles';
import { readSessionFile } from './readSessionFile';
import { WorkspaceRecords } from './WorkspaceRecords';
import { writeSessionFile } from './writeSessionFile';

/**
 * The workspaces, and what each reopens: its last page, its open tabs and
 * their unsaved edits. One is active at a time (the page and the tabs shown).
 *
 *   <dir>/session.json          workspaces (tile, page URL, tabs, active tab) and the active one
 *   <dir>/favicons/<ws>.txt     a workspace's site icon, as a data URL (FaviconFiles)
 *   <dir>/drafts/<tab>.txt      unsaved text of a tab, and what its editing started from (DraftFiles)
 *
 * Changes apply in memory at once (WorkspaceRecords); writes run one at a time
 * after them, each through a temp file and a rename.
 */
export class SessionStore {
  private readonly records = new WorkspaceRecords();
  private readonly writes = new WriteQueue();
  private readonly favicons: FaviconFiles;
  private readonly drafts: DraftFiles;

  constructor(readonly dir: string) {
    this.favicons = new FaviconFiles(join(dir, FAVICONS_DIR), this.writes);
    this.drafts = new DraftFiles(join(dir, DRAFTS_DIR), this.writes);
  }

  async load(): Promise<void> {
    await this.drafts.ensureDir();
    await this.favicons.ensureDir();
    const { state, migrated } = await readSessionFile(this.dir);
    this.records.state = state;
    if (migrated) await writeSessionFile(this.dir, state);
    await this.favicons.load((id) => this.has(id));
    await this.drafts.prune(new Set(state.workspaces.flatMap((w) => w.tabs.map((t) => t.id))));
  }

  /** The active workspace's page and tabs. */
  get(): SessionState {
    return this.records.session();
  }

  get activeId(): string {
    return this.records.state.activeId;
  }

  has(id: unknown): boolean {
    return !!this.records.find(id);
  }

  /** A workspace's last page ('' if none, or if there is no such workspace). */
  urlOf(id: string): string {
    return this.records.find(id)?.url ?? '';
  }

  titleOf(id: string): string {
    return this.records.find(id)?.title ?? '';
  }

  workspaces(): WorkspacesState {
    return this.records.list();
  }

  favicon(id: string): string | null {
    return this.favicons.get(id);
  }

  allFavicons(): Record<string, string> {
    return this.favicons.all();
  }

  /** Remembers the page the active workspace shows. Moving to another site drops the old site's icon. */
  setUrl(url: string): Promise<void> {
    const moved = this.records.setUrl(url);
    if (!moved) return Promise.resolve();
    const dropIcon = moved.otherSite && this.favicons.forget(moved.id);
    return this.saveState(async () => {
      if (dropIcon) await this.favicons.remove(moved.id);
    });
  }

  /** Remembers the title of the page a workspace shows. */
  setTitle(id: string, title: string): Promise<void> {
    return this.records.setTitle(id, title) ? this.saveState() : Promise.resolve();
  }

  setFavicon(id: string, icon: string): Promise<void> {
    return this.has(id) ? this.favicons.set(id, icon) : Promise.resolve();
  }

  setTabs(workspaceId: unknown, input: unknown, activeTabId: unknown): Promise<void> {
    const closed = this.records.setTabs(workspaceId, input, activeTabId);
    return closed ? this.saveState(() => this.drafts.remove(closed.map((t) => t.id))) : Promise.resolve();
  }

  /** Adds an empty workspace after the others. */
  async create(): Promise<Workspace> {
    const w = this.records.add();
    await this.saveState();
    return w;
  }

  async update(id: unknown, patch: WorkspacePatch): Promise<Workspace> {
    const w = this.records.update(id, patch);
    await this.saveState();
    return w;
  }

  /** Deletes a workspace other than the active one, with its drafts and icon. */
  async remove(id: unknown): Promise<void> {
    const w = this.records.delete(id);
    this.favicons.forget(w.id);
    await this.saveState(async () => {
      await this.drafts.remove(w.tabs.map((t) => t.id));
      await this.favicons.remove(w.id);
    });
  }

  /** Active in memory at once (it throws right away for an unknown one); the promise settles once written. */
  setActive(id: unknown): Promise<void> {
    return this.records.activate(id) ? this.saveState() : Promise.resolve();
  }

  getDraft(id: unknown): Promise<SessionDraft | null> {
    return this.drafts.get(id);
  }

  saveDraft(id: unknown, draft: SessionDraft): Promise<void> {
    return this.drafts.save(id, draft);
  }

  deleteDraft(id: unknown): Promise<void> {
    return this.drafts.delete(id);
  }

  /** Queues writing the state as it is when the write runs (later changes are in it too), then `after` (deleting what it no longer lists). */
  private saveState(after?: () => Promise<void>): Promise<void> {
    return this.writes.run(async () => {
      await writeSessionFile(this.dir, this.records.state);
      await after?.();
    });
  }
}
