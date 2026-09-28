import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { capturePick } from './capturePick';

/** Starts picking an element in the page: the one clicked is captured (its component still shows as after any pick). */
export async function pickToCapture(): Promise<void> {
  capturePick.next = true;
  capturePick.starts = 0;
  try {
    await api.startPicking();
  } catch (err) {
    capturePick.next = false;
    toast({ title: 'Could not pick an element', description: errorMessage(err), tone: 'danger' });
  }
}
