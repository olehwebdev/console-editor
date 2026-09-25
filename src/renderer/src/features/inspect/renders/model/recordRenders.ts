import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Starts or stops recording React's commits in the page's frames; the log follows `renders-recording`. */
export async function recordRenders(on: boolean): Promise<void> {
  try {
    await api.recordRenders(on);
  } catch (err) {
    toast({ title: on ? "Couldn't start recording renders" : "Couldn't stop recording renders", description: errorMessage(err), tone: 'danger' });
  }
}
