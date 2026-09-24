import { createHash } from 'node:crypto';
import { SHA256 } from '../../constants';

export function sha256(text: string): string {
  return createHash(SHA256).update(text, 'utf8').digest('hex');
}
