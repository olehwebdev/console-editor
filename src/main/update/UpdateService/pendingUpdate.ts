import type { AvailableUpdate } from '../../../shared/types';
import { PENDING_UPDATE_READERS } from './pendingUpdateReaders';
import type { UpdateStateOf, UpdateStatus } from './types';

/** The update on offer in `state`, if any. Generic so each state reaches its own reader without a cast. */
export function pendingUpdate<S extends UpdateStatus>(state: UpdateStateOf<S>): AvailableUpdate | null {
  return PENDING_UPDATE_READERS[state.status](state);
}
