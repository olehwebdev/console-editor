import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Takes the design off the page (and gives the page its own width back). */
export async function removeOverlay(): Promise<void> {
  try {
    await api.removeOverlay();
  } catch (err) {
    toast({ title: 'Could not take the design off the page', description: errorMessage(err), tone: 'danger' });
  }
}
