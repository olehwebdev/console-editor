import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { WriteQueue } from '../WriteQueue';
import { writeAtomic } from '../writeAtomic';
import { sanitizePageWindow } from './sanitizePageWindow';
import type { SavedPageWindow } from './types';

/** Whether the website had a window of its own, and where that window was: it opens there again. */
export class PageWindowStore {
  private saved: SavedPageWindow = { detached: false };
  private readonly writes = new WriteQueue();

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    try {
      this.saved = sanitizePageWindow(JSON.parse(await readFile(this.path, 'utf8')));
    } catch {
      this.saved = { detached: false };
    }
  }

  get(): SavedPageWindow {
    return this.saved;
  }

  /** Takes effect at once; written one change at a time. A failed write is dropped: the window's place isn't worth an error. */
  update(patch: Partial<SavedPageWindow>): Promise<void> {
    this.saved = { ...this.saved, ...patch };
    const next = this.saved;
    return this.writes
      .run(async () => {
        await mkdir(dirname(this.path), { recursive: true });
        await writeAtomic(this.path, `${JSON.stringify(next, null, 2)}\n`);
      })
      .catch(() => undefined);
  }
}
