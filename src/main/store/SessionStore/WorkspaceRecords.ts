import type { SessionState, SessionTab, Workspace, WorkspacePatch, WorkspacesState } from '../../../shared/types';
import { HTTP_SCHEME } from '../../constants';
import { parseUrl } from '../../parseUrl';
import { MAX_TITLE } from '../constants';
import { sanitizeTabs } from '../sanitizeTabs';
import type { SessionFileState, WorkspaceRecord } from '../types';
import { blankWorkspace } from './blankWorkspace';
import { MAX_WORKSPACES } from './constants';
import { patchWorkspace } from './patchWorkspace';
import { toWorkspace } from './toWorkspace';

/**
 * The workspaces in memory, and the active one. Each change replaces the state
 * rather than editing it, and says whether there is anything to write.
 */
export class WorkspaceRecords {
  /** What the session file holds; a write takes it as it is when the write runs. */
  state: SessionFileState = { activeId: '', workspaces: [] };

  find(id: unknown): WorkspaceRecord | undefined {
    return typeof id === 'string' ? this.state.workspaces.find((w) => w.id === id) : undefined;
  }

  get active(): WorkspaceRecord {
    return this.find(this.state.activeId)!;
  }

  private replace(next: WorkspaceRecord): void {
    this.state = { ...this.state, workspaces: this.state.workspaces.map((w) => (w.id === next.id ? next : w)) };
  }

  /** The active workspace's page and tabs. */
  session(): SessionState {
    const { url, tabs, activeTabId } = this.active;
    return { url, tabs, activeTabId };
  }

  /** Every workspace as the renderer sees it, and the active one. */
  list(): WorkspacesState {
    return { activeId: this.state.activeId, workspaces: this.state.workspaces.map(toWorkspace) };
  }

  /**
   * Remembers the page the active workspace shows (http(s) only: about:blank and
   * errors aren't worth reopening). Returns the workspace's id and whether its page
   * moved to another site; null when there is nothing to remember.
   */
  setUrl(url: string): { id: string; otherSite: boolean } | null {
    const w = this.active;
    if (!HTTP_SCHEME.test(url) || url === w.url) return null;
    this.replace({ ...w, url });
    return { id: w.id, otherSite: parseUrl(url)?.origin !== parseUrl(w.url)?.origin };
  }

  /** Remembers the title of the page a workspace shows; false when unchanged. */
  setTitle(id: string, title: string): boolean {
    const w = this.find(id);
    const next = title.trim().slice(0, MAX_TITLE);
    if (!w || next === w.title) return false;
    this.replace({ ...w, title: next });
    return true;
  }

  /**
   * Remembers a workspace's tabs, and returns the ones closed since. Null when there is
   * no such workspace (deleted meanwhile: nothing left to remember them for).
   */
  setTabs(workspaceId: unknown, input: unknown, activeTabId: unknown): SessionTab[] | null {
    const w = this.find(workspaceId);
    if (!w) return null;
    const tabs = sanitizeTabs(input);
    const active = typeof activeTabId === 'string' && tabs.some((t) => t.id === activeTabId) ? activeTabId : null;
    const kept = new Set(tabs.map((t) => t.id));
    const closed = w.tabs.filter((t) => !kept.has(t.id));
    this.replace({ ...w, tabs, activeTabId: active });
    return closed;
  }

  /** Adds an empty workspace after the others, and returns it as the renderer sees it. */
  add(): Workspace {
    if (this.state.workspaces.length >= MAX_WORKSPACES) throw new Error(`There can be at most ${MAX_WORKSPACES} workspaces`);
    const w = blankWorkspace(this.state.workspaces);
    this.state = { ...this.state, workspaces: [...this.state.workspaces, w] };
    return toWorkspace(w);
  }

  /** Applies `patch` to a workspace, and returns it as the renderer sees it. */
  update(id: unknown, patch: WorkspacePatch): Workspace {
    const w = this.find(id);
    if (!w) throw new Error('Unknown workspace');
    const next = patchWorkspace(w, patch);
    this.replace(next);
    return toWorkspace(next);
  }

  /** Deletes a workspace other than the active one, and returns it. */
  delete(id: unknown): WorkspaceRecord {
    const w = this.find(id);
    if (!w) throw new Error('Unknown workspace');
    if (w.id === this.state.activeId) throw new Error('The workspace in use cannot be deleted');
    this.state = { ...this.state, workspaces: this.state.workspaces.filter((other) => other.id !== w.id) };
    return w;
  }

  /** Makes a workspace the active one; false when it already was. */
  activate(id: unknown): boolean {
    const w = this.find(id);
    if (!w) throw new Error('Unknown workspace');
    if (w.id === this.state.activeId) return false;
    this.state = { ...this.state, activeId: w.id };
    return true;
  }
}
