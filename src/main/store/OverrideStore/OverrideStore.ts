import { join } from 'node:path';
import type { CreateOverrideInput, Override, OverrideMeta, OverridePatch } from '../../../shared/types';
import { defaultMatcherFor } from '../../../shared/matcher';
import { toMeta } from '../toMeta';
import type { StoredOverride } from '../types';
import { assertMatcher } from './assertMatcher';
import { CommittedOverrides } from './CommittedOverrides';
import { FILES_DIR, INDEX_FILE } from './constants';
import { ContentFiles } from './ContentFiles';
import { newOverride } from './newOverride';
import { patchOverride } from './patchOverride';
import { removeWorkspaceOverrides } from './removeWorkspaceOverrides';
import { responseFieldsOf } from './responseFieldsOf';
import { takeFileEdit } from './takeFileEdit';

/**
 * Persists overrides on disk:
 *
 *   <dir>/overrides.json          metadata for every override
 *   <dir>/files/<id>.<ext>        the edited content that gets served (ContentFiles)
 *   <dir>/files/<id>.base.<ext>   the content editing started from (for diffs)
 *
 * Content is kept in memory as well, because the engine needs it synchronously
 * on every intercepted request. The base is only read when a diff asks for it;
 * when it equals the content no base file is written.
 *
 * Changes run one at a time and reach memory (and so the engine) only once
 * they are on disk: a failed write never leaves a half-applied override
 * (CommittedOverrides).
 *
 * Each override belongs to a workspace. `list` and `metas` (what is served and
 * shown) cover the active one's; `get`, `update` and `remove` reach any, so a
 * save still in flight when the workspace changes lands where it began.
 */
export class OverrideStore {
  private workspaceId = '';
  private readonly committed: CommittedOverrides;
  private readonly files: ContentFiles;

  constructor(readonly dir: string) {
    this.committed = new CommittedOverrides(join(dir, INDEX_FILE));
    this.files = new ContentFiles(join(dir, FILES_DIR));
  }

  get filesDir(): string {
    return this.files.dir;
  }

  async load(): Promise<void> {
    await this.files.ensureDir();
    await this.committed.load(this.files);
  }

  /** The workspace whose overrides `list` and `metas` return, and `create` adds to. */
  setWorkspace(id: string): void {
    this.workspaceId = id;
  }

  /** The active workspace's overrides. */
  list(): StoredOverride[] {
    return this.committed.all().filter((o) => o.workspaceId === this.workspaceId);
  }

  metas(): OverrideMeta[] {
    return this.list().map(toMeta);
  }

  meta(id: string): OverrideMeta {
    return toMeta(this.get(id));
  }

  get(id: string): StoredOverride {
    const o = this.committed.get(id);
    if (!o) throw new Error(`Unknown override ${id}`);
    return o;
  }

  /** The content editing started from (for diffs): the content itself unless a separate base was saved. */
  async base(id: string): Promise<string> {
    return this.files.base(this.get(id));
  }

  /** The file an override's served content is kept in, for another editor to open. */
  contentPath(id: string): string {
    return this.files.path(this.get(id), 'content');
  }

  /** Takes an override's file as it is on disk when another editor changed it: true when it did. */
  takeFileEdit(id: string): Promise<boolean> {
    return takeFileEdit(this.committed, this.files, id);
  }

  async create(input: CreateOverrideInput): Promise<Override> {
    const match = input.match ?? defaultMatcherFor(input.sourceUrl);
    assertMatcher(match);
    const fields = responseFieldsOf(input.kind, input.request, input.response);
    // The workspace active when it was asked for, even if another becomes active before it is written.
    const { workspaceId } = this;
    return this.committed.mutate(async (overrides) => {
      const override = { ...newOverride(input, match, workspaceId, overrides), ...fields };
      await this.files.write(override, 'content', override.content);
      if (input.base !== undefined && input.base !== input.content) await this.files.write(override, 'base', input.base);
      overrides.set(override.id, override);
      return override;
    });
  }

  async update(id: string, patch: OverridePatch): Promise<Override> {
    const { kind } = this.get(id);
    if (patch.match) assertMatcher(patch.match);
    if (patch.request || patch.response) responseFieldsOf(kind, patch.request, patch.response, this.get(id));
    return this.committed.mutate(async (overrides) => {
      // Built from the latest committed state, so queued updates don't undo each other.
      const current = overrides.get(id);
      if (!current) throw new Error(`Unknown override ${id}`);
      const next = patchOverride(current, patch);
      if (patch.content !== undefined) await this.files.write(next, 'content', next.content);
      overrides.set(id, next);
      return next;
    });
  }

  async remove(id: string): Promise<void> {
    const o = this.get(id);
    await this.committed.mutate(async (overrides) => {
      overrides.delete(id);
    });
    // Only once the index no longer lists it.
    await this.files.remove(o);
  }

  /** Deletes every override of a workspace. */
  removeWorkspace(workspaceId: string): Promise<void> {
    return removeWorkspaceOverrides(this.committed, this.files, workspaceId);
  }

  /**
   * Gives the overrides of no workspace in `known` (saved before workspaces
   * existed, or whose workspace was lost) to `fallback`, so none is left where
   * nothing serves or shows it.
   */
  async adopt(known: ReadonlySet<string>, fallback: string): Promise<void> {
    if (this.committed.all().every((o) => known.has(o.workspaceId))) return;
    await this.committed.mutate(async (overrides) => {
      for (const [id, o] of overrides) if (!known.has(o.workspaceId)) overrides.set(id, { ...o, workspaceId: fallback });
    });
  }
}
