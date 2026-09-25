import { RESPONSE_KIND } from '@common/overrides';
import type { OverrideMeta } from '@common/types';
import { predicateFor } from '@/shared/lib';

/** The file override that applies to a URL: enabled ones first, then any. Response overrides answer API calls, never files. */
export function findOverrideFor(url: string, overrides: OverrideMeta[]): OverrideMeta | undefined {
  const matching = overrides.filter((o) => o.kind !== RESPONSE_KIND && predicateFor(o.match)(url));
  return matching.find((o) => o.enabled) ?? matching[0];
}
