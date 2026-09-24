import type { OverrideStore } from './types';

export const selectEnabledCount = (s: OverrideStore) => Object.values(s.byId).filter((o) => o.enabled).length;
