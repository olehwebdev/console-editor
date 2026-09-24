import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Restarts into the update (auto), or shows the downloaded file again (manual). */
export function installUpdate(): void {
  void api.installUpdate().catch((err) => toast({ title: "Couldn't install the update", description: errorMessage(err), tone: 'danger' }));
}
