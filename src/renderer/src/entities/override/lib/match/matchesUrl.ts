import type { OverrideMeta } from '@common/types';
import { predicateFor } from '@/shared/lib';

export function matchesUrl(o: OverrideMeta, url: string): boolean {
  return predicateFor(o.match)(url);
}
