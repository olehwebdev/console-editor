import type { BrowserInfo } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Removes a browser the user added. */
export async function removeBrowser(browser: Pick<BrowserInfo, 'id' | 'name'>): Promise<void> {
  try {
    await api.removeBrowser(browser.id);
  } catch (err) {
    toast({ title: `Could not remove ${browser.name}`, description: errorMessage(err), tone: 'danger' });
  }
}
