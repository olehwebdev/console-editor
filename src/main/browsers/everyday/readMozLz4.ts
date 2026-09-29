import { readFile } from 'node:fs/promises';
import { MOZ_LZ4 } from './constants';
import { lz4Block } from './lz4Block';

/** The text of a Firefox `.jsonlz4` file (its session, its search engines…); null when it isn't one, or can't be read. */
export async function readMozLz4(path: string): Promise<string | null> {
  const bytes = await readFile(path).catch(() => null);
  if (!bytes || bytes.length < MOZ_LZ4.dataAt || bytes.toString('latin1', 0, MOZ_LZ4.sizeAt) !== MOZ_LZ4.magic) return null;
  try {
    return lz4Block(bytes.subarray(MOZ_LZ4.dataAt), bytes.readUInt32LE(MOZ_LZ4.sizeAt)).toString('utf8');
  } catch {
    return null;
  }
}
