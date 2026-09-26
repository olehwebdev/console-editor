import type { CodeLocation } from '@common/types';
import { locationKey } from './locationKey';

/** Which component a render is of, across commits: where its function is defined, and its key. */
export function renderKey(location: CodeLocation | null, key: string | null): string | null {
  return location ? `${locationKey(location)}|${key ?? ''}` : null;
}
