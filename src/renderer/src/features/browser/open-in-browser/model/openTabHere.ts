import type { DrivenTab } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Loads a tab's address (a driven browser's, or your everyday one's) in the app's own page. */
export async function openTabHere(tab: Pick<DrivenTab, 'url'>): Promise<void> {
  try {
    await api.navigate(tab.url);
  } catch (err) {
    toast({ title: 'Could not open the page here', description: errorMessage(err), tone: 'danger' });
  }
}
