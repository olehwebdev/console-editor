import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Asks for a browser's program and adds it (the list follows as `browsers-changed`); nothing when none is picked. */
export async function addBrowser(): Promise<void> {
  try {
    const added = await api.addBrowser();
    if (added) toast({ title: `Added ${added.name}`, description: 'It is offered beside the address bar.', tone: 'success' });
  } catch (err) {
    toast({ title: 'Could not add that browser', description: errorMessage(err), tone: 'danger' });
  }
}
