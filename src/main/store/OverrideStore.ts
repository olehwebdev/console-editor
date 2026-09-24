import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CreateOverrideInput, Override, OverrideMeta, OverridePatch, ResourceKind } from '../../shared/types';
import { defaultMatcherFor, validateMatcher } from '../../shared/matcher';

const INDEX_VERSION = 1;

interface IndexFile {
  version: number;
  overrides: OverrideMeta[];
}

function toMeta({ content: _content, base: _base, ...meta }: Override): OverrideMeta {
  return meta;
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
 * on every intercepted request.
 */
export class OverrideStore {
  private readonly overrides = new Map<string, Override>();
  private writes: Promise<void> = Promise.resolve();

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
        const base = await readFile(this.contentPath(meta, 'base'), 'utf8').catch(() => content);
        this.overrides.set(meta.id, { ...meta, content, base });
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

  async create(input: CreateOverrideInput): Promise<Override> {
    const match = input.match ?? defaultMatcherFor(input.sourceUrl);
    const error = validateMatcher(match);
    if (error) throw new Error(error);
    let id: string;
    do id = randomBytes(4).toString('hex');
    while (this.overrides.has(id));
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
      base: input.base ?? input.content,
    };
    this.overrides.set(id, override);
    await this.persist(async () => {
      await writeAtomic(this.contentPath(override, 'content'), override.content);
      await writeAtomic(this.contentPath(override, 'base'), override.base);
    });
    return override;
  }

  async update(id: string, patch: OverridePatch): Promise<Override> {
    const current = this.get(id);
    if (patch.match) {
      const error = validateMatcher(patch.match);
      if (error) throw new Error(error);
    }
    const next: Override = {
      ...current,
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.match ? { match: { ...patch.match } } : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      updatedAt: Date.now(),
    };
    this.overrides.set(id, next);
    await this.persist(async () => {
      if (patch.content !== undefined) await writeAtomic(this.contentPath(next, 'content'), next.content);
    });
    return next;
  }

  async remove(id: string): Promise<void> {
    const o = this.get(id);
    this.overrides.delete(id);
    await this.persist(async () => {
      await rm(this.contentPath(o, 'content'), { force: true });
      await rm(this.contentPath(o, 'base'), { force: true });
    });
  }

  /** Runs file writes one at a time, then rewrites the index. */
  private persist(writeFiles: () => Promise<void>): Promise<void> {
    const run = this.writes.then(async () => {
      await writeFiles();
      const index: IndexFile = { version: INDEX_VERSION, overrides: this.metas() };
      await writeAtomic(this.indexPath, `${JSON.stringify(index, null, 2)}\n`);
    });
    this.writes = run.catch(() => undefined);
    return run;
  }
}
