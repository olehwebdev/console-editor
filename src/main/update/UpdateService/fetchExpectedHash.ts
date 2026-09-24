import { SHA256_HEX, SUM_SEPARATOR } from './constants';
import type { UpdateServiceOptions } from './types';

/** The SHA-256 sum (lower-case hex) the checksums file at `url` lists for the file `name`. */
export async function fetchExpectedHash(fetch: UpdateServiceOptions['fetch'], url: string, name: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`couldn't read the checksums (${res.status})`);
  for (const line of (await res.text()).split('\n')) {
    const [hash, file] = line.trim().split(SUM_SEPARATOR);
    if (file === name && SHA256_HEX.test(hash)) return hash.toLowerCase();
  }
  throw new Error(`the checksums don't list ${name}`);
}
