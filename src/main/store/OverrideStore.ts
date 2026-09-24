import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { CreateOverrideInput, Override, OverrideMeta, OverridePatch, ResourceKind } from '../../shared/types';
import { defaultMatcherFor, validateMatcher } from '../../shared/matcher';
import { FILE_NOT_FOUND } from '../constants';
import { toMeta } from './toMeta';
import { writeAtomic } from './writeAtomic';

const INDEX_VERSION = 1;
const INDEX_FILE = 'overrides.json';
const FILES_DIR = 'files';

/** Override ids are this many random bytes, as hex. */
const ID_BYTES = 4;

interface IndexFile {
  version: number;
  overrides: OverrideMeta[];
}

const EXTENSIONS: Record<ResourceKind, string> = { Script: 'js', Stylesheet: 'css', Document: 'html' };

/**
 * Persists overrides on disk:
 *
 *   <dir>/overrides.json          metadata for every override
 *   <dir>/files/<id>.<ext>        the edited content that gets served
 *   <dir>/files/<id>.base.<ext>   the content editing started from (for diffs)
 *
 * Content is kept in memory as well, because the engine needs it synchronously
 * on every intercepted request. The base is only read when a diff asks for it;
 * when it equals the content no base file is written.
 *
 * Changes run one at a time and reach memory (and so the engine) only once
 * they are on disk: a failed write never leaves a half-applied override.
 */
export class OverrideStore {
  private overrides = new Map<string, Override>();
  private writes: Promise<void> = Promise.resolve();

  constructor(readonly dir: string) {}

  private get indexPath(): string {
    return join(this.dir, INDEX_FILE);
  }

  get filesDir(): string {
    return join(this.dir, FILES_DIR);
  }

  private contentPath(meta: Pick<OverrideMeta, 'id' | 'kind'>, which: 'content' | 'base'): string {
    const ext = EXTENSIONS[meta.kind];
    return join(this.filesDir, which === 'content' ? `${meta.id}.${ext}` : `${meta.id}.base.${ext}`);
  }

  async load(): Promise<void> {
    await mkdir(this.filesDir, { recursive: true });
    let index: IndexFile;
    try {
      index = JSON.parse(await readFile(this.indexPath, 'utf8')) as IndexFile;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === FILE_NOT_FOUND) return;
      throw new Error(`Could not read ${this.indexPath}: ${(err as Error).message}`);
    }
    this.overrides.clear();
    for (const meta of index.overrides ?? []) {
      try {
        const content = await readFile(this.contentPath(meta, 'content'), 'utf8');
        this.overrides.set(meta.id, { ...meta, content });
      } catch {
        // Content file missing: drop the entry rather than serving an empty file.
      }
    }
  }

  list(): Override[] {
    return [...this.overrides.values()];
  }

  metas(): OverrideMeta[] {
    return this.list().map(toMeta);
  }

  meta(id: string): OverrideMeta {
    return toMeta(this.get(id));
  }

  get(id: string): Override {
    const o = this.overrides.get(id);
    if (!o) throw new Error(`Unknown override ${id}`);
    return o;
  }

  /** The content editing started from (for diffs): the content itself unless a separate base was saved. */
  async base(id: string): Promise<string> {
    const o = this.get(id);
    try {
      return await readFile(this.contentPath(o, 'base'), 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === FILE_NOT_FOUND) return o.content;
      throw err;
    }
  }

  async create(input: CreateOverrideInput): Promise<Override> {
    const match = input.match ?? defaultMatcherFor(input.sourceUrl);
    const error = validateMatcher(match);
    if (error) throw new Error(error);
    return this.mutate(async (overrides) => {
      let id: string;
      do id = randomBytes(ID_BYTES).toString('hex');
      while (overrides.has(id));
      const now = Date.now();
      const override: Override = {
        id,
        kind: input.kind,
        sourceUrl: input.sourceUrl,
        match,
        enabled: true,
        originalHash: input.originalHash,
        createdAt: now,
        updatedAt: now,
        content: input.content,
      };
      await writeAtomic(this.contentPath(override, 'content'), override.content);
      if (input.base !== undefined && input.base !== input.content) await writeAtomic(this.contentPath(override, 'base'), input.base);
      overrides.set(id, override);
      return override;
    });
  }

  async update(id: string, patch: OverridePatch): Promise<Override> {
    this.get(id);
    if (patch.match) {
      const error = validateMatcher(patch.match);
      if (error) throw new Error(error);
    }
    return this.mutate(async (overrides) => {
      // Built from the latest committed state, so queued updates don't undo each other.
      const current = overrides.get(id);
      if (!current) throw new Error(`Unknown override ${id}`);
      const next: Override = {
        ...current,
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(patch.match ? { match: { ...patch.match } } : {}),
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        updatedAt: Date.now(),
      };
      if (patch.content !== undefined) await writeAtomic(this.contentPath(next, 'content'), next.content);
      overrides.set(id, next);
      return next;
    });
  }

  async remove(id: string): Promise<void> {
    const o = this.get(id);
    await this.mutate(async (overrides) => {
      overrides.delete(id);
    });
    // Only once the index no longer lists it.
    await rm(this.contentPath(o, 'content'), { force: true });
    await rm(this.contentPath(o, 'base'), { force: true });
  }

  /**
   * Applies `change` to a copy of the overrides (it may write content files),
   * writes the index, and only then makes the copy current. Runs one at a time.
   */
  private mutate<T>(change: (overrides: Map<string, Override>) => Promise<T>): Promise<T> {
    const run = this.writes.then(async () => {
      const next = new Map(this.overrides);
      const result = await change(next);
      const index: IndexFile = { version: INDEX_VERSION, overrides: [...next.values()].map(toMeta) };
      await writeAtomic(this.indexPath, `${JSON.stringify(index, null, 2)}\n`);
      this.overrides = next;
      return result;
    });
    this.writes = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
