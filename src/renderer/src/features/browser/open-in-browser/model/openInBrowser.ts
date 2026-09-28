import type { BrowserInfo } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { usePageStore } from '@/entities/page';

/** Opens the page shown in another browser, with its everyday profile. */
export async function openInBrowser(browser: Pick<BrowserInfo, 'id' | 'name'>): Promise<void> {
  try {
    await api.openInBrowser(browser.id, usePageStore.getState().page.url);
  } catch (err) {
    toast({ title: `Could not open ${browser.name}`, description: errorMessage(err), tone: 'danger' });
  }
}
