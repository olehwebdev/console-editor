import { api } from '@/shared/api';
import { useBrowserStore } from '@/entities/browser';

/**
 * Asks for the browsers (the main process looks again when its list is a minute old) and the ones driven with the
 * workspace's changes; a failure leaves the lists as they were, the browsers looked for.
 */
export async function loadBrowsers(): Promise<void> {
  const { setAll, setDriven } = useBrowserStore.getState();
  const [browsers, driven] = await Promise.all([api.listBrowsers().catch(() => useBrowserStore.getState().browsers), api.listDriven().catch(() => useBrowserStore.getState().driven)]);
  setAll(browsers);
  setDriven(driven);
}
