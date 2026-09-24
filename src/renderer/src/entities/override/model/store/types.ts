import type { OverrideMeta } from '@common/types';

export interface OverrideStore {
  byId: Record<string, OverrideMeta>;
  /** Times each override was served this session. */
  hits: Record<string, number>;
  /** Overrides whose live file changed since they were created. */
  upstreamChanged: Record<string, true>;

  setAll(overrides: OverrideMeta[]): void;
  upsert(override: OverrideMeta): void;
  hit(id: string): void;
  markUpstreamChanged(id: string): void;
}
