import type { BrowserInfo } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { confirm } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { useBrowserStore } from '@/entities/browser';

/**
 * Downloads a browser build the app keeps (WebKit's), once you agree to its size; its progress shows in its row while
 * it comes. Whether it is there now.
 */
export async function downloadBuild(browser: Pick<BrowserInfo, 'id' | 'name'>): Promise<boolean> {
  const agreed = await confirm({
    title: `Download ${browser.name}?`,
    body: `The app checks pages in ${browser.name} with Playwright's build of it, about 90 MB, kept in its data folder. On Linux it needs system libraries you may have to install (npx playwright install-deps webkit).`,
    confirmLabel: 'Download',
  });
  if (!agreed) return false;
  try {
    await api.downloadBrowser(browser.id);
    toast({ title: `${browser.name} is downloaded`, tone: 'success' });
    return true;
  } catch (err) {
    toast({ title: `Could not download ${browser.name}`, description: errorMessage(err), tone: 'danger' });
    return false;
  } finally {
    useBrowserStore.getState().setDownload(browser.id, null);
  }
}
