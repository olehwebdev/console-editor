import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { WriteQueue } from '../WriteQueue';
import { writeAtomic } from '../writeAtomic';
import { BROWSERS_FILE_VERSION, MAX_ADDED_BROWSERS, MAX_HIDDEN_BROWSERS } from './constants';
import { sanitizeBrowserPrefs } from './sanitizeBrowserPrefs';
import type { AddedBrowser, BrowserPrefs } from './types';

/** The browsers the user added, and the ones they turned off (`browsers.json`), for every workspace. */
export class BrowserStore {
  private prefs: BrowserPrefs = { added: [], hidden: [] };
  private readonly writes = new WriteQueue();

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    try {
      this.prefs = sanitizeBrowserPrefs(JSON.parse(await readFile(this.path, 'utf8')));
    } catch {
      this.prefs = { added: [], hidden: [] };
    }
  }

  get(): BrowserPrefs {
    return this.prefs;
  }

  add(browser: AddedBrowser): Promise<void> {
    if (this.prefs.added.length >= MAX_ADDED_BROWSERS) return Promise.reject(new Error(`At most ${MAX_ADDED_BROWSERS} browsers can be added`));
    return this.save({ ...this.prefs, added: [...this.prefs.added, browser] });
  }

  remove(id: string): Promise<void> {
    return this.save({ added: this.prefs.added.filter((b) => b.id !== id), hidden: this.prefs.hidden.filter((h) => h !== id) });
  }

  setHidden(id: string, hidden: boolean): Promise<void> {
    const others = this.prefs.hidden.filter((h) => h !== id);
    return this.save({ ...this.prefs, hidden: hidden ? [...others, id].slice(-MAX_HIDDEN_BROWSERS) : others });
  }

  /** Takes effect at once; written one change at a time, and a failed write rejects (the user asked for the change). */
  private save(next: BrowserPrefs): Promise<void> {
    this.prefs = next;
    return this.writes.run(async () => {
      await mkdir(dirname(this.path), { recursive: true });
      await writeAtomic(this.path, `${JSON.stringify({ version: BROWSERS_FILE_VERSION, ...next }, null, 2)}\n`);
    });
  }
}
