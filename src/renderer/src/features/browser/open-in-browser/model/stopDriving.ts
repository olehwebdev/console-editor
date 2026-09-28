import type { DrivenBrowser } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Stops serving the workspace's changes in a driven browser; it stays open. */
export async function stopDriving(browser: DrivenBrowser): Promise<void> {
  try {
    await api.stopDriving(browser.id);
  } catch (err) {
    toast({ title: `Could not let go of ${browser.name}`, description: errorMessage(err), tone: 'danger' });
  }
}
