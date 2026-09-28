import type { DrivenBrowser, DrivenTab } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Brings a driven browser's tab to the front. */
export async function activateTab(browser: DrivenBrowser, tab: DrivenTab): Promise<void> {
  try {
    await api.activateTab(browser.id, tab.id);
  } catch (err) {
    toast({ title: `Could not show the tab in ${browser.name}`, description: errorMessage(err), tone: 'danger' });
  }
}
