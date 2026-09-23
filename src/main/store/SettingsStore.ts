import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/types';

export class SettingsStore {
  private settings: Settings = { ...DEFAULT_SETTINGS };

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

  async update(patch: Partial<Settings>): Promise<Settings> {
    this.settings = { ...this.settings, ...pickKnown(patch) };
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(`${this.path}.tmp`, `${JSON.stringify(this.settings, null, 2)}\n`, 'utf8');
    await rename(`${this.path}.tmp`, this.path);
    return this.settings;
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
