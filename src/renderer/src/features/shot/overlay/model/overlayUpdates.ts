import type { OverlaySettings } from '@common/types';

/** Settings changes not sent yet, and whether one is on its way: shared by the files that queue and send them. */
export const overlayUpdates: { pending: Partial<OverlaySettings> | null; sending: boolean } = { pending: null, sending: false };
