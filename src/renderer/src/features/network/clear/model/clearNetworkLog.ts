import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useNetworkStore } from '@/entities/network-request';

/** Empties the Network panel, here at once and in the main process (whose log a restarting window reads). */
export function clearNetworkLog(): void {
  useNetworkStore.getState().clear();
  api.clearNetworkLog().catch((err: unknown) => toast({ title: 'Could not clear the network log', description: errorMessage(err), tone: 'danger' }));
}
