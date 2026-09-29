import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useBrowserStore } from '@/entities/browser';

/** Reads your everyday browsers' tabs (Firefox's session files, macOS scripting: in the main process), and keeps them for the menu. */
export async function loadEverydayTabs(): Promise<void> {
  try {
    useBrowserStore.getState().setEveryday(await api.listEverydayTabs());
  } catch (err) {
    toast({ title: 'Could not read your open tabs', description: errorMessage(err), tone: 'danger' });
  }
}
