import type { AvailableUpdate } from '@common/types';
import type { OfferedUpdateReaders, UpdateStateOf, UpdateStatus } from './types';

/** The release each updater state has on offer. Annotated rather than `satisfies`: `offeredUpdate`'s generic lookup needs the mapped type. */
const OFFERED_UPDATE: OfferedUpdateReaders = {
  disabled: () => null,
  idle: () => null,
  checking: () => null,
  'up-to-date': () => null,
  available: (state) => state.update,
  downloading: (state) => state.update,
  ready: (state) => state.update,
  // Also after its download failed, to try again.
  error: (state) => state.update ?? null,
};

/** The release on offer in `state`, if any. Generic so each status reaches its own reader without a cast. */
export function offeredUpdate<S extends UpdateStatus>(state: UpdateStateOf<S>): AvailableUpdate | null {
  // A status this build doesn't know (main and renderer out of step, e.g. mid dev reload) offers nothing.
  if (!Object.hasOwn(OFFERED_UPDATE, state.status)) return null;
  return OFFERED_UPDATE[state.status](state);
}
