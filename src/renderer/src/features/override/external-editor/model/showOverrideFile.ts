import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Shows an override's file in the system's file manager, to open it in any editor. */
export async function showOverrideFile(overrideId: string): Promise<void> {
  try {
    await api.showOverrideFile(overrideId);
  } catch (err) {
    toast({ title: 'Could not show the file', description: errorMessage(err), tone: 'danger' });
  }
}
