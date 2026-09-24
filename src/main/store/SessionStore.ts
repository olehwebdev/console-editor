import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  WORKSPACE_COLORS,
  type ResourceKind,
  type SessionDraft,
  type SessionState,
  type SessionTab,
  type Workspace,
  type WorkspaceColor,
  type WorkspaceIcon,
  type WorkspacePatch,
  type WorkspacesState,
} from '../../shared/types';

const VERSION = 2;
const KINDS = new Set<ResourceKind>(['Script', 'Stylesheet', 'Document']);
const TAB_ID = /^[\w-]{1,64}$/;
const WORKSPACE_ID = /^[0-9a-f]{8}$/;
const MAX_TABS = 200;
const MAX_WORKSPACES = 50;
export const MAX_WORKSPACE_NAME = 40;
const MAX_TITLE = 200;
/** A favicon as kept: a data URL of an image (see favicon.ts for the size it is held to). */
const FAVICON = /^data:image\/[\w.+-]+[;,]/i;
const MAX_FAVICON_CHARS = 128 * 1024;

/** A workspace as stored: its rail tile, its page and its tabs. */
interface WorkspaceRecord {
  id: string;
  name: string;
  icon: WorkspaceIcon;
  color: WorkspaceColor;
  /** Last page shown ('' if none), and its title. */
  url: string;
  title: string;
  tabs: SessionTab[];
  activeTabId: string | null;
}

interface State {
  activeId: string;
  workspaces: WorkspaceRecord[];
}

async function writeAtomic(path: string, content: string): Promise<void> {
  const tmp = `${path}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, path);
}

function assertTabId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !TAB_ID.test(id)) throw new Error('Invalid tab id');
}

const isColor = (value: unknown): value is WorkspaceColor => WORKSPACE_COLORS.includes(value as WorkspaceColor);

const isFavicon = (value: unknown): value is string => typeof value === 'string' && value.length <= MAX_FAVICON_CHARS && FAVICON.test(value);

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/** Keeps only well-formed tabs, so a corrupt file or a bad message can't inject junk. */
function sanitizeTabs(input: unknown): SessionTab[] {
  if (!Array.isArray(input)) return [];
  const tabs: SessionTab[] = [];
  for (const t of input.slice(0, MAX_TABS) as Array<Partial<SessionTab>>) {
    if (!t || typeof t.id !== 'string' || !TAB_ID.test(t.id) || typeof t.url !== 'string' || !KINDS.has(t.kind as ResourceKind)) continue;
    tabs.push({
      id: t.id,
      url: t.url,
      kind: t.kind as ResourceKind,
      ...(typeof t.overrideId === 'string' ? { overrideId: t.overrideId } : {}),
      originalHash: typeof t.originalHash === 'string' ? t.originalHash : null,
    });
  }
  return tabs;
}

/** A page with its tabs, as saved (a version 1 session file has the same fields at its top level). */
function sanitizePage(input: Partial<WorkspaceRecord>): Pick<WorkspaceRecord, 'url' | 'title' | 'tabs' | 'activeTabId'> {
  const tabs = sanitizeTabs(input.tabs);
  return {
    url: typeof input.url === 'string' ? input.url : '',
    title: typeof input.title === 'string' ? input.title.slice(0, MAX_TITLE) : '',
    tabs,
    activeTabId: tabs.some((t) => t.id === input.activeTabId) ? (input.activeTabId as string) : null,
  };
}

function sanitizeWorkspace(input: unknown): WorkspaceRecord | null {
  const w = input as Partial<WorkspaceRecord> | null;
  if (!w || typeof w.id !== 'string' || !WORKSPACE_ID.test(w.id)) return null;
  return {
    id: w.id,
    name: typeof w.name === 'string' ? w.name.slice(0, MAX_WORKSPACE_NAME) : '',
    icon: w.icon === 'color' ? 'color' : 'favicon',
    color: isColor(w.color) ? w.color : WORKSPACE_COLORS[0],
    ...sanitizePage(w),
  };
}

/**
 * The workspaces, and what each reopens: its last page, its open tabs and
 * their unsaved edits. One is active at a time (the page and the tabs shown).
 *
 *   <dir>/session.json          workspaces (tile, page URL, tabs, active tab) and the active one
 *   <dir>/favicons/<ws>.txt     a workspace's site icon, as a data URL
 *   <dir>/drafts/<tab>.txt      unsaved text of a tab (tab ids are unique across workspaces)
 *   <dir>/drafts/<tab>.base.txt what that tab's editing started from (tabs not yet saved as overrides)
 *
 * Changes apply in memory at once; writes run one at a time after them, each
 * through a temp file and a rename.
 */
export class SessionStore {
  private state: State = { activeId: '', workspaces: [] };
  private readonly favicons = new Map<string, string>();
  private writes: Promise<void> = Promise.resolve();

  constructor(readonly dir: string) {}

  private get draftsDir(): string {
    return join(this.dir, 'drafts');
  }

  private get faviconsDir(): string {
    return join(this.dir, 'favicons');
  }

  private draftPath(id: string, which: 'content' | 'base'): string {
    return join(this.draftsDir, which === 'content' ? `${id}.txt` : `${id}.base.txt`);
  }

  private faviconPath(id: string): string {
    return join(this.faviconsDir, `${id}.txt`);
  }

  async load(): Promise<void> {
    await mkdir(this.draftsDir, { recursive: true });
    await mkdir(this.faviconsDir, { recursive: true });
    let saved: Record<string, unknown> | null = null;
    try {
      saved = JSON.parse(await readFile(join(this.dir, 'session.json'), 'utf8')) as Record<string, unknown>;
    } catch {
      // Missing or corrupt: start with one empty workspace.
    }
    const workspaces: WorkspaceRecord[] = [];
    let migrated = false;
    if (Array.isArray(saved?.workspaces)) {
      for (const input of saved.workspaces.slice(0, MAX_WORKSPACES)) {
        const w = sanitizeWorkspace(input);
        if (w && !workspaces.some((other) => other.id === w.id)) workspaces.push(w);
      }
    } else if (saved) {
      // Version 1 kept one page and its tabs: they become the first workspace.
      workspaces.push({ ...this.blank([]), ...sanitizePage(saved) });
      migrated = true;
    }
    if (!workspaces.length) workspaces.push(this.blank([]));
    const activeId = workspaces.find((w) => w.id === saved?.activeId)?.id ?? workspaces[0].id;
    this.state = { activeId, workspaces };
    if (migrated) await this.writeState();

    this.favicons.clear();
    for (const file of await readdir(this.faviconsDir)) {
      const id = file.replace(/\.txt$/, '');
      const icon = this.find(id) ? await readFile(join(this.faviconsDir, file), 'utf8').catch(() => '') : '';
      if (isFavicon(icon)) this.favicons.set(id, icon);
      else await rm(join(this.faviconsDir, file), { force: true });
    }
    // Drafts of tabs no longer open in any workspace (e.g. a crash between the two writes).
    const open = new Set(workspaces.flatMap((w) => w.tabs.map((t) => t.id)));
    for (const file of await readdir(this.draftsDir)) {
      const id = file.replace(/(\.base)?\.txt$/, '');
      if (!open.has(id)) await rm(join(this.draftsDir, file), { force: true });
    }
  }

  private find(id: unknown): WorkspaceRecord | undefined {
    return typeof id === 'string' ? this.state.workspaces.find((w) => w.id === id) : undefined;
  }

  private get active(): WorkspaceRecord {
    return this.find(this.state.activeId)!;
  }

  private replace(next: WorkspaceRecord): void {
    this.state = { ...this.state, workspaces: this.state.workspaces.map((w) => (w.id === next.id ? next : w)) };
  }

  /** An empty workspace, in a colour none of `existing` has while there is one. */
  private blank(existing: WorkspaceRecord[]): WorkspaceRecord {
    let id: string;
    do id = randomBytes(4).toString('hex');
    while (existing.some((w) => w.id === id));
    const used = new Set(existing.map((w) => w.color));
    const color = WORKSPACE_COLORS.find((c) => !used.has(c)) ?? WORKSPACE_COLORS[existing.length % WORKSPACE_COLORS.length];
    return { id, name: '', icon: 'favicon', color, url: '', title: '', tabs: [], activeTabId: null };
  }

  private info(w: WorkspaceRecord): Workspace {
    return { id: w.id, name: w.name, host: hostOf(w.url), title: w.title, icon: w.icon, color: w.color };
  }

  /** The active workspace's page and tabs. */
  get(): SessionState {
    const { url, tabs, activeTabId } = this.active;
    return { url, tabs, activeTabId };
  }

  get activeId(): string {
    return this.state.activeId;
  }

  has(id: unknown): boolean {
    return !!this.find(id);
  }

  /** A workspace's last page ('' if none, or if there is no such workspace). */
  urlOf(id: string): string {
    return this.find(id)?.url ?? '';
  }

  titleOf(id: string): string {
    return this.find(id)?.title ?? '';
  }

  workspaces(): WorkspacesState {
    return { activeId: this.state.activeId, workspaces: this.state.workspaces.map((w) => this.info(w)) };
  }

  favicon(id: string): string | null {
    return this.favicons.get(id) ?? null;
  }

  allFavicons(): Record<string, string> {
    return Object.fromEntries(this.favicons);
  }

  /**
   * Remembers the page the active workspace shows (http(s) only: about:blank and
   * errors aren't worth reopening). Moving to another site drops the old site's icon.
   */
  setUrl(url: string): Promise<void> {
    const w = this.active;
    if (!/^https?:/i.test(url) || url === w.url) return Promise.resolve();
    const otherSite = originOf(url) !== originOf(w.url) && this.favicons.delete(w.id);
    this.replace({ ...w, url });
    return this.queue(async () => {
      await this.writeState();
      if (otherSite) await rm(this.faviconPath(w.id), { force: true });
    });
  }

  /** Remembers the title of the page a workspace shows. */
  setTitle(id: string, title: string): Promise<void> {
    const w = this.find(id);
    const next = title.trim().slice(0, MAX_TITLE);
    if (!w || next === w.title) return Promise.resolve();
    this.replace({ ...w, title: next });
    return this.queue(() => this.writeState());
  }

  setFavicon(id: string, icon: string): Promise<void> {
    if (!this.find(id) || !isFavicon(icon) || this.favicons.get(id) === icon) return Promise.resolve();
    this.favicons.set(id, icon);
    return this.queue(() => writeAtomic(this.faviconPath(id), icon));
  }

  setTabs(workspaceId: unknown, input: unknown, activeTabId: unknown): Promise<void> {
    const w = this.find(workspaceId);
    // Deleted meanwhile: nothing left to remember them for.
    if (!w) return Promise.resolve();
    const tabs = sanitizeTabs(input);
    const active = typeof activeTabId === 'string' && tabs.some((t) => t.id === activeTabId) ? activeTabId : null;
    const kept = new Set(tabs.map((t) => t.id));
    const closed = w.tabs.filter((t) => !kept.has(t.id));
    this.replace({ ...w, tabs, activeTabId: active });
    return this.queue(async () => {
      await this.writeState();
      for (const tab of closed) await this.removeDraftFiles(tab.id);
    });
  }

  /** Adds an empty workspace after the others. */
  async create(): Promise<Workspace> {
    if (this.state.workspaces.length >= MAX_WORKSPACES) throw new Error(`There can be at most ${MAX_WORKSPACES} workspaces`);
    const w = this.blank(this.state.workspaces);
    this.state = { ...this.state, workspaces: [...this.state.workspaces, w] };
    await this.queue(() => this.writeState());
    return this.info(w);
  }

  async update(id: unknown, patch: WorkspacePatch): Promise<Workspace> {
    const w = this.find(id);
    if (!w) throw new Error('Unknown workspace');
    const { name, icon, color } = patch ?? {};
    if (name !== undefined && typeof name !== 'string') throw new Error('name must be a string');
    if (icon !== undefined && icon !== 'favicon' && icon !== 'color') throw new Error(`Unsupported icon ${String(icon)}`);
    if (color !== undefined && !isColor(color)) throw new Error(`Unsupported colour ${String(color)}`);
    const next: WorkspaceRecord = {
      ...w,
      ...(name !== undefined ? { name: name.slice(0, MAX_WORKSPACE_NAME) } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...(color !== undefined ? { color } : {}),
    };
    this.replace(next);
    await this.queue(() => this.writeState());
    return this.info(next);
  }

  /** Deletes a workspace other than the active one, with its drafts and icon. */
  async remove(id: unknown): Promise<void> {
    const w = this.find(id);
    if (!w) throw new Error('Unknown workspace');
    if (w.id === this.state.activeId) throw new Error('The workspace in use cannot be deleted');
    this.state = { ...this.state, workspaces: this.state.workspaces.filter((other) => other.id !== w.id) };
    this.favicons.delete(w.id);
    await this.queue(async () => {
      await this.writeState();
      for (const tab of w.tabs) await this.removeDraftFiles(tab.id);
      await rm(this.faviconPath(w.id), { force: true });
    });
  }

  /** Active in memory at once (it throws right away for an unknown one); the promise settles once written. */
  setActive(id: unknown): Promise<void> {
    const w = this.find(id);
    if (!w) throw new Error('Unknown workspace');
    if (w.id === this.state.activeId) return Promise.resolve();
    this.state = { ...this.state, activeId: w.id };
    return this.queue(() => this.writeState());
  }

  async getDraft(id: unknown): Promise<SessionDraft | null> {
    assertTabId(id);
    await this.writes;
    try {
      const content = await readFile(this.draftPath(id, 'content'), 'utf8');
      const base = await readFile(this.draftPath(id, 'base'), 'utf8').catch(() => undefined);
      return base === undefined ? { content } : { content, base };
    } catch {
      return null;
    }
  }

  saveDraft(id: unknown, draft: SessionDraft): Promise<void> {
    assertTabId(id);
    if (typeof draft?.content !== 'string') throw new Error('Invalid draft');
    if (draft.base !== undefined && typeof draft.base !== 'string') throw new Error('Invalid draft base');
    return this.queue(async () => {
      if (draft.base !== undefined) await writeAtomic(this.draftPath(id, 'base'), draft.base);
      await writeAtomic(this.draftPath(id, 'content'), draft.content);
    });
  }

  deleteDraft(id: unknown): Promise<void> {
    assertTabId(id);
    return this.queue(() => this.removeDraftFiles(id));
  }

  private async removeDraftFiles(id: string): Promise<void> {
    await rm(this.draftPath(id, 'content'), { force: true });
    await rm(this.draftPath(id, 'base'), { force: true });
  }

  /** Writes the state as it is when the write runs (later changes are in it too). */
  private writeState(): Promise<void> {
    return writeAtomic(join(this.dir, 'session.json'), `${JSON.stringify({ version: VERSION, ...this.state }, null, 2)}\n`);
  }

  private queue(write: () => Promise<void>): Promise<void> {
    const run = this.writes.then(write);
    this.writes = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
