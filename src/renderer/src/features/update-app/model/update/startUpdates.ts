import { api } from '@/shared/api';
import { useUpdateStore } from '@/entities/app-update';
import { handleUpdateState } from './handleUpdateState';
import { openWhatsNew } from './openWhatsNew';

/** Loads the updater's state, and opens What's New right after an update. */
export async function startUpdates(): Promise<void> {
  const [info, state] = await Promise.all([api.getAppInfo(), api.getUpdateState()]);
  useUpdateStore.getState().setInfo(info);
  handleUpdateState(state);
  if (info.updatedFrom) openWhatsNew();
}
