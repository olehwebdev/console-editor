import type { ConsoleAction } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { confirm } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { useActionEditor } from './useActionEditor';

/** Deletes an action once confirmed, closing the form if it was open on it. */
export async function deleteAction(action: ConsoleAction): Promise<void> {
  const ok = await confirm({ title: `Delete the action “${action.name}”?`, body: 'Its code is deleted with it.', confirmLabel: 'Delete', tone: 'danger' });
  if (!ok) return;
  const { editing, close } = useActionEditor.getState();
  if (editing?.id === action.id) close();
  try {
    await api.deleteAction(action.id);
  } catch (err) {
    toast({ title: 'Could not delete the action', description: errorMessage(err), tone: 'danger' });
  }
}
