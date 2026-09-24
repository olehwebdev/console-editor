import { useUpdateStore } from '@/entities/app-update';
import type { UpdateStateOf, UpdateStatus } from './types';
import { UPDATE_STATE_NOTICES } from './updateStateNotices';

/**
 * Keeps the store in step with the main process, and tells the user what they need to know.
 * Generic so each state reaches its own handler without a cast.
 */
export function handleUpdateState<S extends UpdateStatus>(state: UpdateStateOf<S>): void {
  const prev = useUpdateStore.getState().state;
  useUpdateStore.getState().setState(state);
  UPDATE_STATE_NOTICES[state.status](state, prev);
}
