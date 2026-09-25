import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';

/** Imports a HAR the user picks: each fetch() or XHR response in it becomes a response override, answered without sending the request. */
export async function importHar(): Promise<void> {
  try {
    const result = await api.importHar();
    if (!result) return;
    const { created, skipped } = result;
    toast({
      title: created ? `Imported ${created} ${created === 1 ? 'response' : 'responses'} as overrides` : 'Nothing to import',
      description: `${created ? 'Each answers its request without sending it, as the HAR recorded it. ' : ''}${skipped ? `${skipped} ${skipped === 1 ? 'entry was' : 'entries were'} left out: not fetch or XHR, no text body, or an earlier response to the same request.` : ''}`.trim(),
      tone: created ? 'success' : 'warning',
      duration: TOAST_DURATION.actionable,
    });
  } catch (err) {
    toast({ title: 'Could not import the HAR', description: errorMessage(err), tone: 'danger' });
  }
}
