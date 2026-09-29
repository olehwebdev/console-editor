import type { DrivenBrowser, DrivenTab } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Captures what a driven browser's tab shows; it joins the shots (announced). */
export async function captureTab(browser: DrivenBrowser, tab: DrivenTab): Promise<void> {
  try {
    const shot = await api.captureTabShot(browser.id, tab.id, 'viewport');
    toast({ title: `Captured the page in ${browser.name}`, description: shot.name, tone: 'success' });
  } catch (err) {
    toast({ title: `Could not capture the page in ${browser.name}`, description: errorMessage(err), tone: 'danger' });
  }
}
