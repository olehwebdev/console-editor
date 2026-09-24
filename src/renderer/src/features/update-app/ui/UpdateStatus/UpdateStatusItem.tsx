import type { UpdateStateOf, UpdateStatus } from '@/entities/app-update';
import { UPDATE_STATUS_ITEMS } from './updateStatusItems';

/** Generic so each state reaches its own item without a cast. */
export function UpdateStatusItem<S extends UpdateStatus>({ state }: { state: UpdateStateOf<S> }) {
  return UPDATE_STATUS_ITEMS[state.status](state);
}
