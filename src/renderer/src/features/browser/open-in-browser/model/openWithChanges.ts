import type { BrowserInfo } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { usePageStore } from '@/entities/page';
import { downloadBuild } from './downloadBuild';

/**
 * Opens the page shown in a browser the app drives, served the workspace's overrides and rules: with a profile of the
 * app's own, or in your everyday one (`everyday`: a Chromium browser with remote debugging turned on, which asks you to
 * allow it). A build the app downloads (WebKit's) is downloaded first, once you agree.
 */
export async function openWithChanges(browser: Pick<BrowserInfo, 'id' | 'name' | 'build'>, everyday = false): Promise<void> {
  if (browser.build && !browser.build.downloaded && !(await downloadBuild(browser))) return;
  try {
    await api.openWithChanges(browser.id, usePageStore.getState().page.url, everyday);
  } catch (err) {
    toast({ title: `Could not open ${everyday ? `your ${browser.name}` : browser.name} with your changes`, description: errorMessage(err), tone: 'danger' });
  }
}
