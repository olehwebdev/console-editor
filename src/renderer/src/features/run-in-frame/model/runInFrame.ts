import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useWorkspaceStore } from '@/entities/workspace';
import { rememberCode } from './rememberCode';

/** Runs code in a frame; its input and result show in the console. Resolves false if it couldn't be run. */
export async function runInFrame(frameId: string, code: string): Promise<boolean> {
  if (!code.trim()) return false;
  const { activeId } = useWorkspaceStore.getState();
  if (activeId) rememberCode(activeId, code);
  try {
    await api.evaluateInFrame(frameId, code);
    return true;
  } catch (err) {
    toast({ title: 'Could not run that code', description: errorMessage(err), tone: 'danger' });
    return false;
  }
}
