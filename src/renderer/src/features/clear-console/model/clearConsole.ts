import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useConsoleStore } from '@/entities/console-log';

/** Empties the console, here at once and in the main process (which frees the values rows kept alive in the page). */
export function clearConsole(): void {
  useConsoleStore.getState().clear();
  api.clearConsole().catch((err: unknown) => toast({ title: 'Could not clear the console', description: errorMessage(err), tone: 'danger' }));
}
