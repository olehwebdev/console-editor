import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CreateOverrideInput, Override, OverrideMeta, OverridePatch, ResourceKind } from '../../shared/types';
import { defaultMatcherFor, validateMatcher } from '../../shared/matcher';

const INDEX_VERSION = 1;

/** An override as kept here, with the workspace it belongs to. */
export type StoredOverride = Override & { workspaceId: string };
type IndexEntry = OverrideMeta & { workspaceId: string };

interface IndexFile {
  version: number;
  /** `workspaceId` is missing from overrides saved before workspaces existed. */
  overrides: Array<OverrideMeta & { workspaceId?: string }>;
}

function toMeta({ content: _content, workspaceId: _workspaceId, ...meta }: StoredOverride): OverrideMeta {
  return meta;
}

function toIndexEntry({ content: _content, ...entry }: StoredOverride): IndexEntry {
  return entry;
}

const EXTENSIONS: Record<ResourceKind, string> = { Script: 'js', Stylesheet: 'css', Document: 'html' };

/** Writes via a temp file + rename so a crash never leaves a half-written file. */
async function writeAtomic(path: string, content: string): Promise<void> {
  const tmp = `${path}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, path);
}

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
 *
 * Each override belongs to a workspace. `list` and `metas` (what is served and
 * shown) cover the active one's; `get`, `update` and `remove` reach any, so a
 * save still in flight when the workspace changes lands where it began.
 */
export class OverrideStore {
  private overrides = new Map<string, StoredOverride>();
  private writes: Promise<void> = Promise.resolve();
  private workspaceId = '';

  constructor(readonly dir: string) {}

  private get indexPath(): string {
    return join(this.dir, 'overrides.json');
  }

  get filesDir(): string {
    return join(this.dir, 'files');
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
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw new Error(`Could not read ${this.indexPath}: ${(err as Error).message}`);
    }
    this.overrides.clear();
    for (const meta of index.overrides ?? []) {
      try {
        const content = await readFile(this.contentPath(meta, 'content'), 'utf8');
        this.overrides.set(meta.id, { ...meta, workspaceId: typeof meta.workspaceId === 'string' ? meta.workspaceId : '', content });
      } catch {
        // Content file missing: drop the entry rather than serving an empty file.
      }
    }
  }

  /** The workspace whose overrides `list` and `metas` return, and `create` adds to. */
  setWorkspace(id: string): void {
    this.workspaceId = id;
  }

  /** The active workspace's overrides. */
  list(): StoredOverride[] {
    return [...this.overrides.values()].filter((o) => o.workspaceId === this.workspaceId);
  }

  metas(): OverrideMeta[] {
    return this.list().map(toMeta);
  }

  meta(id: string): OverrideMeta {
    return toMeta(this.get(id));
  }

  get(id: string): StoredOverride {
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
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return o.content;
      throw err;
    }
  }

  async create(input: CreateOverrideInput): Promise<Override> {
    const match = input.match ?? defaultMatcherFor(input.sourceUrl);
    const error = validateMatcher(match);
    if (error) throw new Error(error);
    // The workspace active when it was asked for, even if another becomes active before it is written.
    const { workspaceId } = this;
    return this.mutate(async (overrides) => {
      let id: string;
      do id = randomBytes(4).toString('hex');
      while (overrides.has(id));
      const now = Date.now();
      const override: StoredOverride = {
        workspaceId,
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
      const next: StoredOverride = {
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

  /** Deletes every override of a workspace. */
  async removeWorkspace(workspaceId: string): Promise<void> {
    if (![...this.overrides.values()].some((o) => o.workspaceId === workspaceId)) return;
    const gone = await this.mutate(async (overrides) => {
      const gone = [...overrides.values()].filter((o) => o.workspaceId === workspaceId);
      for (const o of gone) overrides.delete(o.id);
      return gone;
    });
    for (const o of gone) {
      await rm(this.contentPath(o, 'content'), { force: true });
      await rm(this.contentPath(o, 'base'), { force: true });
    }
  }

  /**
   * Gives the overrides of no workspace in `known` (saved before workspaces
   * existed, or whose workspace was lost) to `fallback`, so none is left where
   * nothing serves or shows it.
   */
  async adopt(known: ReadonlySet<string>, fallback: string): Promise<void> {
    if ([...this.overrides.values()].every((o) => known.has(o.workspaceId))) return;
    await this.mutate(async (overrides) => {
      for (const [id, o] of overrides) if (!known.has(o.workspaceId)) overrides.set(id, { ...o, workspaceId: fallback });
    });
  }

  /**
   * Applies `change` to a copy of the overrides (it may write content files),
   * writes the index, and only then makes the copy current. Runs one at a time.
   */
  private mutate<T>(change: (overrides: Map<string, StoredOverride>) => Promise<T>): Promise<T> {
    const run = this.writes.then(async () => {
      const next = new Map(this.overrides);
      const result = await change(next);
      const index: IndexFile = { version: INDEX_VERSION, overrides: [...next.values()].map(toIndexEntry) };
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
