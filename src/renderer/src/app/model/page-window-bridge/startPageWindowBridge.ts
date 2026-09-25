import { api, onAppEvent } from '@/shared/api';
import { usePageStore } from '@/entities/page';
import { handlePageWindowEvent } from './handlePageWindowEvent';

/** The website window's link to the main process: the page's state, for its toolbar, and its shortcut. Returns a cleanup. */
export async function startPageWindowBridge(): Promise<() => void> {
  const off = onAppEvent(handlePageWindowEvent);
  // Asked once listening, which the main process waits for to focus the address bar (Ctrl/Cmd+L while this loaded).
  // Applied as its reply arrives, in order with the events around it (a later one is newer).
  usePageStore.getState().setPage(await api.getPageState());
  return off;
}
