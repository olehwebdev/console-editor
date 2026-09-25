import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { writeAtomic } from '../store/writeAtomic';

/** Writes `content` to `file`, creating its folder, unless the file holds exactly that already. Says whether it wrote. */
export async function writeIfChanged(file: string, content: string | Uint8Array): Promise<boolean> {
  const current = await readFile(file).catch(() => null);
  if (current?.equals(typeof content === 'string' ? Buffer.from(content) : content)) return false;
  await mkdir(dirname(file), { recursive: true });
  await writeAtomic(file, content);
  return true;
}
