import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { showOverrideFile } from './showOverrideFile';

/** Opens an override's file in VS Code: what is saved there is served, and the page reloads with it. */
export async function openInEditor(overrideId: string): Promise<void> {
  try {
    await api.openOverrideInEditor(overrideId);
  } catch (err) {
    toast({
      title: 'Could not open VS Code',
      description: errorMessage(err),
      tone: 'danger',
      action: { label: 'Show in folder', onClick: () => void showOverrideFile(overrideId) },
    });
  }
}
