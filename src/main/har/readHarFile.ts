import { readFile, stat } from 'node:fs/promises';
import { MAX_HAR_BYTES } from './constants';

/** A HAR file's entries, as found (checked one by one when used). Throws for a file too big, not JSON, or with no log of entries. */
export async function readHarFile(path: string): Promise<unknown[]> {
  if ((await stat(path)).size > MAX_HAR_BYTES) throw new Error(`That HAR is over ${MAX_HAR_BYTES / 1024 / 1024} MB`);
  let har: unknown;
  try {
    har = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new Error("That file isn't JSON, so it isn't a HAR");
  }
  const entries = (har as { log?: { entries?: unknown } } | null)?.log?.entries;
  if (!Array.isArray(entries)) throw new Error('That file has no log of requests, so it isn’t a HAR');
  return entries;
}
