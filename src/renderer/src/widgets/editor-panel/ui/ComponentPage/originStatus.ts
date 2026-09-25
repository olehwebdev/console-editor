import type { OriginalPlace } from '@/entities/inspector';
import type { OriginStatus } from './constants';

/** Where a function's original lookup is: the store has no entry while it runs, and null once there is none. */
export function originStatus(origin: OriginalPlace | null | undefined): OriginStatus {
  if (origin) return 'found';
  return origin === null ? 'none' : 'looking';
}
