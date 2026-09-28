import { api } from '@/shared/api';
import { useBrowserStore } from '@/entities/browser';

/** Asks for the browsers (the main process looks again when its list is a minute old); a failure leaves the list as it was, looked for. */
export async function loadBrowsers(): Promise<void> {
  const { setAll } = useBrowserStore.getState();
  setAll(await api.listBrowsers().catch(() => useBrowserStore.getState().browsers));
}
