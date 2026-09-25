import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';

/** Saves these requests (the ones the list shows) as a HAR file where the user picks, and says where. */
export async function exportHar(ids: readonly string[]): Promise<void> {
  try {
    const path = await api.exportHar([...ids]);
    if (path) toast({ title: `Saved ${ids.length} ${ids.length === 1 ? 'request' : 'requests'} as ${fileName(path)}`, description: 'With the bodies the page still holds.', tone: 'success', duration: TOAST_DURATION.confirm });
  } catch (err) {
    toast({ title: 'Could not export the requests', description: errorMessage(err), tone: 'danger' });
  }
}
