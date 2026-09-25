import { isRecord } from '../isRecord';
import { MAP_EXTENSION, MAX_NAME_LENGTH } from './constants';
import type { StoredMapFile } from './types';

/** A copy's own name only (no folder), as the store names them. */
const COPY_NAME = /^[\w-]+\.map$/;

/** Whether an index entry holds up: its texts present and not too long, its copy one the store named, its numbers counts. */
export function isStoredMapFile(entry: unknown): entry is StoredMapFile {
  if (!isRecord(entry)) return false;
  const texts = [entry.workspaceId, entry.bundleUrl, entry.name].every((value) => typeof value === 'string' && value.length > 0 && value.length <= MAX_NAME_LENGTH);
  const counts = [entry.size, entry.addedAt].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0);
  return texts && counts && typeof entry.file === 'string' && entry.file.endsWith(MAP_EXTENSION) && COPY_NAME.test(entry.file);
}
