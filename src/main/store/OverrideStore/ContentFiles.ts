import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Override } from '../../../shared/types';
import { FILE_NOT_FOUND } from '../../constants';
import { writeAtomic } from '../writeAtomic';
import { BASE_MARK, EXTENSIONS } from './constants';
import type { ContentFile, FileOwner } from './types';

/**
 * Overrides' content, a file each:
 *
 *   <dir>/<id>.<ext>        the edited content that gets served
 *   <dir>/<id>.base.<ext>   the content editing started from (for diffs), when it differs
 */
export class ContentFiles {
  constructor(readonly dir: string) {}

  private path(meta: FileOwner, which: ContentFile): string {
    const ext = EXTENSIONS[meta.kind];
    return join(this.dir, which === 'content' ? `${meta.id}.${ext}` : `${meta.id}.${BASE_MARK}.${ext}`);
  }

  async ensureDir(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  read(meta: FileOwner, which: ContentFile): Promise<string> {
    return readFile(this.path(meta, which), 'utf8');
  }

  /** The content editing started from (for diffs): the content itself unless a separate base was saved. */
  async base(o: Override): Promise<string> {
    try {
      return await this.read(o, 'base');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === FILE_NOT_FOUND) return o.content;
      throw err;
    }
  }

  write(meta: FileOwner, which: ContentFile, text: string): Promise<void> {
    return writeAtomic(this.path(meta, which), text);
  }

  /** Deletes an override's files. */
  async remove(meta: FileOwner): Promise<void> {
    await rm(this.path(meta, 'content'), { force: true });
    await rm(this.path(meta, 'base'), { force: true });
  }
}
