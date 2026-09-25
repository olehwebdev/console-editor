import { createHash } from 'node:crypto';
import { open, rename, rm } from 'node:fs/promises';
import { SHA256 } from '../../constants';

/**
 * Writes `body` to `partial` as it arrives, and renames it to `target` only once
 * its SHA-256 is `expected`; deletes it otherwise. `onBytes` hears the bytes received so far.
 */
export async function saveVerified(
  body: NonNullable<Response['body']>,
  partial: string,
  target: string,
  expected: string,
  onBytes: (received: number) => void,
): Promise<void> {
  const hash = createHash(SHA256);
  let received = 0;
  const file = await open(partial, 'w');
  try {
    const reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      await file.write(value);
      received += value.byteLength;
      onBytes(received);
    }
    await file.close();
    if (hash.digest('hex') !== expected) throw new Error('the file is damaged (its checksum does not match)');
    await rename(partial, target);
  } catch (err) {
    await file.close().catch(() => undefined);
    await rm(partial, { force: true });
    throw err;
  }
}
