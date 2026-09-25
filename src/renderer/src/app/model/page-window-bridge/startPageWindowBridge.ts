import { api, onAppEvent } from '@/shared/api';
import { usePageStore } from '@/entities/page';
import { handlePageWindowEvent } from './handlePageWindowEvent';

/** The website window's link to the main process: the page's state, for its toolbar, and its shortcut. Returns a cleanup. */
export async function startPageWindowBridge(): Promise<() => void> {
  const off = onAppEvent(handlePageWindowEvent);
  // Applied as its reply arrives, in order with the events around it (a later one is newer).
  usePageStore.getState().setPage(await api.getPageState());
  return off;
}
