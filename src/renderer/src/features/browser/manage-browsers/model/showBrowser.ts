import type { BrowserInfo } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Offers a browser beside the address bar again, or stops offering it. */
export async function showBrowser(browser: Pick<BrowserInfo, 'id' | 'name'>, shown: boolean): Promise<void> {
  try {
    await api.setBrowserHidden(browser.id, !shown);
  } catch (err) {
    toast({ title: `Could not change ${browser.name}`, description: errorMessage(err), tone: 'danger' });
  }
}
