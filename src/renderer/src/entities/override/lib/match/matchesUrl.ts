import type { OverrideMeta } from '@common/types';
import { predicateFor } from './predicateFor';

export function matchesUrl(o: OverrideMeta, url: string): boolean {
  return predicateFor(o)(url);
}
