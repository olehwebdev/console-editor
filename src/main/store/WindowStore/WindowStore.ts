import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { WriteQueue } from '../WriteQueue';
import { writeAtomic } from '../writeAtomic';
import { sanitizeWindow } from './sanitizeWindow';
import type { SavedWindow } from './types';

/** Whether one of the app's own windows was open, and where it was: it opens there again. One file per window. */
export class WindowStore {
  private saved: SavedWindow = { detached: false };
  private readonly writes = new WriteQueue();

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    try {
      this.saved = sanitizeWindow(JSON.parse(await readFile(this.path, 'utf8')));
    } catch {
      this.saved = { detached: false };
    }
  }

  get(): SavedWindow {
    return this.saved;
  }

  /** Takes effect at once; written one change at a time. A failed write is dropped: the window's place isn't worth an error. */
  update(patch: Partial<SavedWindow>): Promise<void> {
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
