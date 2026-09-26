import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { pathFileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { countLabel } from './countLabel';

/** Saves the active workspace's overrides and rules as one file where the user picks, to import in another workspace or a teammate's app. */
export async function exportOverrides(): Promise<void> {
  try {
    const result = await api.exportOverrides();
    if (!result) return;
    toast({
      title: `Exported ${countLabel(result.overrides, 'override')} and ${countLabel(result.rules, 'rule')}`,
      description: `Saved as ${pathFileName(result.path)}. Import it in another workspace, or send it to a teammate.`,
      tone: 'success',
      duration: TOAST_DURATION.actionable,
    });
  } catch (err) {
    toast({ title: 'Could not export the overrides', description: errorMessage(err), tone: 'danger' });
  }
}
