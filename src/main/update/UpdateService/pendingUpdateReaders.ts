import type { PendingUpdateReaders } from './types';

/** The update on offer in each state. Annotated rather than `satisfies`: `pendingUpdate`'s generic lookup needs the mapped type. */
export const PENDING_UPDATE_READERS: PendingUpdateReaders = {
  disabled: () => null,
  idle: () => null,
  checking: () => null,
  'up-to-date': () => null,
  available: (state) => state.update,
  downloading: (state) => state.update,
  ready: (state) => state.update,
  // An update found earlier stays on offer after a failed step.
  error: (state) => state.update ?? null,
};
