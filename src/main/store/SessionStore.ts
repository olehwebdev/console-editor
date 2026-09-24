import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionDraft, SessionState } from '../../shared/types';
import { HTTP_SCHEME } from '../constants';
import { assertTabId } from './assertTabId';
import { sanitizeTabs } from './sanitizeTabs';
import { writeAtomic } from './writeAtomic';

const VERSION = 1;
const SESSION_FILE = 'session.json';
const DRAFTS_DIR = 'drafts';
/** A tab's draft file, and the file of the text its editing started from. */
const DRAFT_SUFFIX = { content: '.txt', base: '.base.txt' } as const;

/**
 * What the app reopens on start: the last page, the open tabs and their
 * unsaved edits.
 *
 *   <dir>/session.json          page URL, tabs, active tab
 *   <dir>/drafts/<tab>.txt      unsaved text of a tab
 *   <dir>/drafts/<tab>.base.txt what that tab's editing started from (tabs not yet saved as overrides)
 *
 * Writes run one at a time, each through a temp file and a rename.
 */
export class SessionStore {
  private state: SessionState = { url: '', tabs: [], activeTabId: null };
  private writes: Promise<void> = Promise.resolve();

  constructor(readonly dir: string) {}

  private get draftsDir(): string {
    return join(this.dir, DRAFTS_DIR);
  }

  private draftPath(id: string, which: 'content' | 'base'): string {
    return join(this.draftsDir, `${id}${DRAFT_SUFFIX[which]}`);
  }

  async load(): Promise<void> {
    await mkdir(this.draftsDir, { recursive: true });
    try {
      const saved = JSON.parse(await readFile(join(this.dir, SESSION_FILE), 'utf8')) as Partial<SessionState>;
      const tabs = sanitizeTabs(saved.tabs);
      this.state = {
        url: typeof saved.url === 'string' ? saved.url : '',
        tabs,
        activeTabId: tabs.some((t) => t.id === saved.activeTabId) ? (saved.activeTabId as string) : null,
      };
    } catch {
      this.state = { url: '', tabs: [], activeTabId: null };
    }
    // Drafts of tabs that are no longer open (e.g. a crash between the two writes).
    const open = new Set(this.state.tabs.map((t) => t.id));
    for (const file of await readdir(this.draftsDir)) {
      // The base's suffix first: it also ends with the content's.
      const suffix = [DRAFT_SUFFIX.base, DRAFT_SUFFIX.content].find((s) => file.endsWith(s));
      const id = suffix ? file.slice(0, -suffix.length) : file;
      if (!open.has(id)) await rm(join(this.draftsDir, file), { force: true });
    }
  }

  get(): SessionState {
    return this.state;
  }

  /** Remembers the page shown (http(s) only: about:blank and errors aren't worth reopening). */
  setUrl(url: string): Promise<void> {
    if (!HTTP_SCHEME.test(url) || url === this.state.url) return Promise.resolve();
    return this.queue(async () => {
      this.state = { ...this.state, url };
      await this.writeState();
    });
  }

  setTabs(input: unknown, activeTabId: unknown): Promise<void> {
    const tabs = sanitizeTabs(input);
    const active = typeof activeTabId === 'string' && tabs.some((t) => t.id === activeTabId) ? activeTabId : null;
    return this.queue(async () => {
      const kept = new Set(tabs.map((t) => t.id));
      const closed = this.state.tabs.filter((t) => !kept.has(t.id));
      this.state = { ...this.state, tabs, activeTabId: active };
      await this.writeState();
      for (const tab of closed) await this.removeDraftFiles(tab.id);
    });
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

  private writeState(): Promise<void> {
    return writeAtomic(join(this.dir, SESSION_FILE), `${JSON.stringify({ version: VERSION, ...this.state }, null, 2)}\n`);
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
