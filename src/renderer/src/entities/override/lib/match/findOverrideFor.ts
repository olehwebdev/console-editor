import type { OverrideMeta } from '@common/types';
import { predicateFor } from '@/shared/lib';

/** The override that applies to a URL: enabled ones first, then any. */
export function findOverrideFor(url: string, overrides: OverrideMeta[]): OverrideMeta | undefined {
  const matching = overrides.filter((o) => predicateFor(o.match)(url));
  return matching.find((o) => o.enabled) ?? matching[0];
}
