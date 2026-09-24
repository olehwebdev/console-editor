import type { OverlayStore } from './types';

export const selectAnyOverlayOpen = (s: OverlayStore) => s.open > 0;
