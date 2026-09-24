import type { OverrideStore } from './types';

export const selectOverrideList = (s: OverrideStore) => Object.values(s.byId);
