import { createHash } from 'node:crypto';

/** OpenSSL's name for the digest. */
const ALGORITHM = 'sha256';

export function sha256(text: string): string {
  return createHash(ALGORITHM).update(text, 'utf8').digest('hex');
}
