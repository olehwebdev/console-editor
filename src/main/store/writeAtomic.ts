import { randomBytes } from 'node:crypto';
import { rename, writeFile } from 'node:fs/promises';

/** Random bytes (as hex) in a temp file's name, so concurrent writes never share one. */
const TEMP_NAME_BYTES = 4;

/** Writes via a temp file + rename so a crash never leaves a half-written file. */
export async function writeAtomic(path: string, content: string): Promise<void> {
  const tmp = `${path}.${randomBytes(TEMP_NAME_BYTES).toString('hex')}.tmp`;
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, path);
}
