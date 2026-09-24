import { readFile } from 'node:fs/promises';
import { FILE_NOT_FOUND } from '../../constants';
import type { StoredOverride } from '../types';
import type { ContentFiles } from './ContentFiles';
import type { IndexFile } from './types';

/** The overrides the index at `indexPath` lists, with their content from `files`; null when there is no index yet. */
export async function readOverrides(indexPath: string, files: ContentFiles): Promise<Map<string, StoredOverride> | null> {
  let index: IndexFile;
  try {
    index = JSON.parse(await readFile(indexPath, 'utf8')) as IndexFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === FILE_NOT_FOUND) return null;
    throw new Error(`Could not read ${indexPath}: ${(err as Error).message}`);
  }
  const overrides = new Map<string, StoredOverride>();
  for (const meta of index.overrides ?? []) {
    try {
      const content = await files.read(meta, 'content');
      overrides.set(meta.id, { ...meta, workspaceId: typeof meta.workspaceId === 'string' ? meta.workspaceId : '', content });
    } catch {
      // Content file missing: drop the entry rather than serving an empty file.
    }
  }
  return overrides;
}
