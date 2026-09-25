import type { ActionInput } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useActionEditor } from './useActionEditor';

/**
 * Adds an action (`id` null) or changes one, then closes the form; the list
 * follows as `actions-changed`. Resolves false, with the form still open, if it
 * couldn't be saved.
 */
export async function saveAction(id: string | null, input: ActionInput): Promise<boolean> {
  try {
    if (id === null) await api.createAction(input);
    else await api.updateAction(id, input);
  } catch (err) {
    toast({ title: 'Could not save the action', description: errorMessage(err), tone: 'danger' });
    return false;
  }
  useActionEditor.getState().close();
  return true;
}
