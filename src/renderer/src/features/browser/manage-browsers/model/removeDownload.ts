import type { BrowserInfo } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Removes a browser build the app downloaded (WebKit's); it is downloaded again when next used. */
export async function removeDownload(browser: Pick<BrowserInfo, 'id' | 'name'>): Promise<void> {
  try {
    await api.removeBrowserDownload(browser.id);
  } catch (err) {
    toast({ title: `Could not remove the ${browser.name} download`, description: errorMessage(err), tone: 'danger' });
  }
}
