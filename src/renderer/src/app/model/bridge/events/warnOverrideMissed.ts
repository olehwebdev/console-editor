import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { reloadPage } from '@/features/navigate-page';
import type { AppEventOf } from '../types';
import { OVERRIDE_MISSED_TOAST_ID_PREFIX, OVERRIDE_MISSED_TOAST_MS } from './constants';

/** The page received the live file although an enabled override matched it. */
export function warnOverrideMissed(event: AppEventOf<'override-missed'>): void {
  toast({
    id: `${OVERRIDE_MISSED_TOAST_ID_PREFIX}${event.overrideId}`,
    title: `Your override didn't apply to ${fileName(event.url)}`,
    description: 'The page loaded the live file instead, e.g. it was already loading when the override was turned on. Reloading usually fixes it.',
    tone: 'warning',
    action: { label: 'Reload page', onClick: () => void reloadPage() },
    duration: OVERRIDE_MISSED_TOAST_MS,
  });
}
