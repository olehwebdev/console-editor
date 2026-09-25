import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionDraft } from '../../../shared/types';
import { assertTabId } from '../assertTabId';
import type { WriteQueue } from '../WriteQueue';
import { writeAtomic } from '../writeAtomic';
import { DRAFT_SUFFIX } from './constants';

/**
 * Tabs' unsaved edits (tab ids are unique across workspaces):
 *
 *   <dir>/<tab>.txt      unsaved text of a tab
 *   <dir>/<tab>.base.txt what that tab's editing started from (tabs not yet saved as overrides)
 *
 * Writes go through the session's queue, after the changes queued before them.
 */
export class DraftFiles {
  constructor(
    private readonly dir: string,
    private readonly writes: WriteQueue,
  ) {}

  private path(id: string, which: keyof typeof DRAFT_SUFFIX): string {
    return join(this.dir, `${id}${DRAFT_SUFFIX[which]}`);
  }

  async ensureDir(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  /** Deletes the drafts of tabs not in `open` (e.g. after a crash between the two writes). */
  async prune(open: ReadonlySet<string>): Promise<void> {
    for (const file of await readdir(this.dir)) {
      // The base's suffix first: it also ends with the content's.
      const suffix = [DRAFT_SUFFIX.base, DRAFT_SUFFIX.content].find((s) => file.endsWith(s));
      const id = suffix ? file.slice(0, -suffix.length) : file;
      if (!open.has(id)) await rm(join(this.dir, file), { force: true });
    }
  }

  async get(id: unknown): Promise<SessionDraft | null> {
    assertTabId(id);
    await this.writes.idle();
    try {
      const content = await readFile(this.path(id, 'content'), 'utf8');
      const base = await readFile(this.path(id, 'base'), 'utf8').catch(() => undefined);
      return base === undefined ? { content } : { content, base };
    } catch {
      return null;
    }
  }

  save(id: unknown, draft: SessionDraft): Promise<void> {
    assertTabId(id);
    if (typeof draft?.content !== 'string') throw new Error('Invalid draft');
    if (draft.base !== undefined && typeof draft.base !== 'string') throw new Error('Invalid draft base');
    return this.writes.run(async () => {
      if (draft.base !== undefined) await writeAtomic(this.path(id, 'base'), draft.base);
      await writeAtomic(this.path(id, 'content'), draft.content);
    });
  }

  delete(id: unknown): Promise<void> {
    assertTabId(id);
    return this.writes.run(() => this.remove([id]));
  }

  /** Deletes tabs' draft files now, one tab after another: for writes already running in the queue. */
  async remove(ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      await rm(this.path(id, 'content'), { force: true });
      await rm(this.path(id, 'base'), { force: true });
    }
  }
}
