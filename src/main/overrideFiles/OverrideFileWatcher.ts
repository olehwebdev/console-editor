import { watch, type FSWatcher } from 'node:fs';
import { EDIT_SETTLE_MS } from './constants';
import type { FileWatcherDeps } from './types';

/**
 * Watches the folder of override files for edits made in another editor (VS Code), and hands the
 * overrides whose files changed to `deps.onEdited` in one batch once the folder has been quiet for
 * `EDIT_SETTLE_MS`. The app's own writes come through here too; `take` finds them unchanged.
 */
export class OverrideFileWatcher {
  private watcher: FSWatcher | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly touched = new Set<string>();
  /** A change the platform didn't name a file for: every override is checked. */
  private unnamed = false;
  /** The batch being read: the next one waits for it, so a slow read is never overtaken. */
  private reading: Promise<void> = Promise.resolve();

  constructor(private readonly deps: FileWatcherDeps) {}

  start(): void {
    try {
      // Not persistent: watching never keeps the app from quitting.
      this.watcher = watch(this.deps.dir, { persistent: false }, (_event, name) => this.touch(name));
    } catch (err) {
      console.warn(`Not watching ${this.deps.dir} for edits made elsewhere: ${(err as Error).message}`);
      return;
    }
    this.watcher.on('error', (err) => {
      console.warn(`Stopped watching ${this.deps.dir}: ${err.message}`);
      this.stop();
    });
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    clearTimeout(this.timer);
  }

  private touch(name: string | null): void {
    const id = name ? this.deps.idOf(name) : null;
    if (name && !id) return;
    if (id) this.touched.add(id);
    else this.unnamed = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.settle(), EDIT_SETTLE_MS);
  }

  private settle(): void {
    const ids = this.unnamed ? this.deps.ids() : [...this.touched];
    this.touched.clear();
    this.unnamed = false;
    // A batch that fails never holds back the next.
    this.reading = this.reading.then(() => this.take(ids)).catch((err: Error) => console.warn(`Could not take edits made elsewhere: ${err.message}`));
  }

  private async take(ids: string[]): Promise<void> {
    const edited: string[] = [];
    for (const id of ids) {
      try {
        if (await this.deps.take(id)) edited.push(id);
      } catch (err) {
        console.warn(`Could not read the edited file of override ${id}: ${(err as Error).message}`);
      }
    }
    if (edited.length) this.deps.onEdited(edited);
  }
}
