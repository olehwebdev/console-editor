import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

export function downloadUpdate(): void {
  void api.downloadUpdate().catch((err) => toast({ title: "Couldn't download the update", description: errorMessage(err), tone: 'danger' }));
}
