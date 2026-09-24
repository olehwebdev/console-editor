import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/types';
import { pickKnown } from './pickKnown';
import { writeAtomic } from './writeAtomic';

export class SettingsStore {
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private writes: Promise<void> = Promise.resolve();

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    try {
      const saved = JSON.parse(await readFile(this.path, 'utf8')) as Partial<Settings>;
      this.settings = { ...DEFAULT_SETTINGS, ...pickKnown(saved) };
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  get(): Settings {
    return this.settings;
  }

  /** Writes one update at a time; the new settings take effect only once they are on disk. */
  update(patch: Partial<Settings>): Promise<Settings> {
    const run = this.writes.then(async () => {
      const next = { ...this.settings, ...pickKnown(patch) };
      await mkdir(dirname(this.path), { recursive: true });
      await writeAtomic(this.path, `${JSON.stringify(next, null, 2)}\n`);
      this.settings = next;
      return next;
    });
    this.writes = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
