import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { SourceMapFileInfo } from '../../../shared/types';
import { WriteQueue } from '../WriteQueue';
import { writeAtomic } from '../writeAtomic';
import { INDEX_FILE, MAP_EXTENSION, MAX_MAP_FILES, MAX_NAME_LENGTH, SOURCE_MAPS_DIR } from './constants';
import { readIndex } from './readIndex';
import type { StoredMapFile } from './types';

/**
 * Source maps loaded from files, for bundles whose site doesn't publish them
 * (**Load a source map…**). Each belongs to a workspace and a bundle URL.
 *
 *   <dir>/source-maps/index.json   which copy is whose
 *   <dir>/source-maps/<uuid>.map   a copy of each file, as picked
 *
 * The index changes one write at a time, on a copy that becomes current once written.
 */
export class SourceMapFileStore {
  private workspaceId = '';
  private current: StoredMapFile[] = [];
  private readonly writes = new WriteQueue();
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = join(dir, SOURCE_MAPS_DIR);
  }

  async load(): Promise<void> {
    this.current = await readIndex(join(this.dir, INDEX_FILE));
  }

  setWorkspace(id: string): void {
    this.workspaceId = id;
  }

  /** The active workspace's maps loaded from files. */
  list(): SourceMapFileInfo[] {
    return this.current.filter((entry) => entry.workspaceId === this.workspaceId).map(({ bundleUrl, name, size, addedAt }) => ({ bundleUrl, name, size, addedAt }));
  }

  /** The map the active workspace loaded for a bundle, as bytes, with its file's name; null if none. */
  async read(bundleUrl: string): Promise<{ name: string; bytes: Uint8Array } | null> {
    const entry = this.find(this.workspaceId, bundleUrl);
    if (!entry) return null;
    const bytes = await readFile(join(this.dir, entry.file)).catch(() => null);
    return bytes ? { name: entry.name, bytes: new Uint8Array(bytes) } : null;
  }

  /** Keeps a map for a bundle in the active workspace, in place of one it had. */
  async add(bundleUrl: string, fileName: string, bytes: Uint8Array): Promise<SourceMapFileInfo> {
    const { workspaceId } = this;
    return this.writes.run(async () => {
      const others = this.current.filter((entry) => !(entry.workspaceId === workspaceId && entry.bundleUrl === bundleUrl));
      if (others.filter((entry) => entry.workspaceId === workspaceId).length >= MAX_MAP_FILES) throw new Error(`A workspace keeps at most ${MAX_MAP_FILES} source maps loaded from files`);
      const entry: StoredMapFile = { workspaceId, bundleUrl, name: basename(fileName).slice(0, MAX_NAME_LENGTH), size: bytes.byteLength, addedAt: Date.now(), file: `${randomUUID()}${MAP_EXTENSION}` };
      await mkdir(this.dir, { recursive: true });
      await writeAtomic(join(this.dir, entry.file), bytes);
      await this.commit([...others, entry]);
      return { bundleUrl, name: entry.name, size: entry.size, addedAt: entry.addedAt };
    });
  }

  /** Forgets the active workspace's map for a bundle. */
  forget(bundleUrl: string): Promise<void> {
    const { workspaceId } = this;
    return this.writes.run(() => this.commit(this.current.filter((entry) => !(entry.workspaceId === workspaceId && entry.bundleUrl === bundleUrl))));
  }

  /** A workspace is deleted: its maps go with it. */
  removeWorkspace(id: string): Promise<void> {
    return this.writes.run(() => this.commit(this.current.filter((entry) => entry.workspaceId !== id)));
  }

  private find(workspaceId: string, bundleUrl: string): StoredMapFile | undefined {
    return this.current.find((entry) => entry.workspaceId === workspaceId && entry.bundleUrl === bundleUrl);
  }

  /** Writes the index, makes it current, then deletes the copies it no longer names. */
  private async commit(next: StoredMapFile[]): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeAtomic(join(this.dir, INDEX_FILE), JSON.stringify(next, null, 2));
    const kept = new Set(next.map((entry) => entry.file));
    const dropped = this.current.filter((entry) => !kept.has(entry.file));
    this.current = next;
    await Promise.all(dropped.map((entry) => rm(join(this.dir, entry.file), { force: true })));
  }
}
