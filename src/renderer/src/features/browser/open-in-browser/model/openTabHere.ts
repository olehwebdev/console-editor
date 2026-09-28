import type { DrivenTab } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Loads a driven tab's address in the app's own page. */
export async function openTabHere(tab: DrivenTab): Promise<void> {
  try {
    await api.navigate(tab.url);
  } catch (err) {
    toast({ title: 'Could not open the page here', description: errorMessage(err), tone: 'danger' });
  }
}
