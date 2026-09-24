import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { useOverrideStore } from '@/entities/override';
import type { AppEventOf } from '../types';

/** The live file was redeployed since its override was made: said once per override. */
export function warnUpstreamChanged(event: AppEventOf<'upstream-changed'>): void {
  if (!useOverrideStore.getState().upstreamChanged[event.overrideId]) {
    toast({
      title: `The live ${fileName(event.url)} changed`,
      description: 'It was redeployed since you created this override. Your version is still served.',
      tone: 'warning',
    });
  }
  useOverrideStore.getState().markUpstreamChanged(event.overrideId);
}
