import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/types';

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
      const tmp = `${this.path}.${randomBytes(4).toString('hex')}.tmp`;
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
      await rename(tmp, this.path);
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

/** Keeps only known boolean settings, so a corrupt or old file can't inject junk. */
function pickKnown(input: Partial<Settings>): Partial<Settings> {
  const out: Partial<Settings> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>) {
    if (typeof input[key] === 'boolean') out[key] = input[key];
  }
  return out;
}
