import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { isFavicon } from '../isFavicon';
import type { WriteQueue } from '../WriteQueue';
import { writeAtomic } from '../writeAtomic';
import { FAVICON_SUFFIX } from './constants';

/**
 * Workspaces' site icons, as data URLs: in memory, and a file each
 * (`<dir>/<workspace id>.txt`). Writes go through the session's queue.
 */
export class FaviconFiles {
  private readonly icons = new Map<string, string>();

  constructor(
    private readonly dir: string,
    private readonly writes: WriteQueue,
  ) {}

  private path(id: string): string {
    return join(this.dir, `${id}${FAVICON_SUFFIX}`);
  }

  async ensureDir(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  /** Reads the icons of the workspaces `isKnown` accepts, and deletes the rest (and unreadable ones). */
  async load(isKnown: (id: string) => boolean): Promise<void> {
    this.icons.clear();
    for (const file of await readdir(this.dir)) {
      const id = file.endsWith(FAVICON_SUFFIX) ? file.slice(0, -FAVICON_SUFFIX.length) : file;
      const icon = isKnown(id) ? await readFile(join(this.dir, file), 'utf8').catch(() => '') : '';
      if (isFavicon(icon)) this.icons.set(id, icon);
      else await rm(join(this.dir, file), { force: true });
    }
  }

  get(id: string): string | null {
    return this.icons.get(id) ?? null;
  }

  all(): Record<string, string> {
    return Object.fromEntries(this.icons);
  }

  /** Keeps `icon` in memory at once, and queues writing it (unless it isn't one, or is the one kept). */
  set(id: string, icon: string): Promise<void> {
    if (!isFavicon(icon) || this.icons.get(id) === icon) return Promise.resolve();
    this.icons.set(id, icon);
    return this.writes.run(() => writeAtomic(this.path(id), icon));
  }

  /** Drops a workspace's icon from memory; true when it had one. Its file goes with `remove`. */
  forget(id: string): boolean {
    return this.icons.delete(id);
  }

  /** Deletes a workspace's icon file now: for writes already running in the queue. */
  async remove(id: string): Promise<void> {
    await rm(this.path(id), { force: true });
  }
}
