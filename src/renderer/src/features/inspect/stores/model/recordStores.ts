import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Starts or stops recording the actions of the page's stores; the log follows `stores-recording`. */
export async function recordStores(on: boolean): Promise<void> {
  try {
    await api.recordStores(on);
  } catch (err) {
    toast({ title: on ? "Couldn't start recording store actions" : "Couldn't stop recording store actions", description: errorMessage(err), tone: 'danger' });
  }
}
