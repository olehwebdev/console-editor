import type { BrowserInfo } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { usePageStore } from '@/entities/page';

/** Opens the page shown in a Chromium browser with a profile of the app's own, served the workspace's overrides and rules. */
export async function openWithChanges(browser: Pick<BrowserInfo, 'id' | 'name'>): Promise<void> {
  try {
    await api.openWithChanges(browser.id, usePageStore.getState().page.url);
  } catch (err) {
    toast({ title: `Could not open ${browser.name} with your changes`, description: errorMessage(err), tone: 'danger' });
  }
}
