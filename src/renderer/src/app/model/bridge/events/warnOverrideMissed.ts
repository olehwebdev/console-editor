import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { useOverrideStore } from '@/entities/override';
import { reloadPage } from '@/features/navigate-page';
import type { AppEventOf } from '../types';
import { OVERRIDE_MISSED_TOAST_ID_PREFIX, OVERRIDE_MISSED_TOAST_MS } from './constants';
import { MISSED_TOASTS, UNEXPLAINED_MISS } from './missedToasts';

/** Between an override's id and its `updatedAt`: one version of the override. */
const VERSION_SEPARATOR = '@';

/** Versions of overrides (`id@updatedAt`) already told of a miss that is said once per version. */
const toldOnce = new Set<string>();

/** The page received the live file although an enabled override matched it: says why, when the main process knows. */
export function warnOverrideMissed(event: AppEventOf<'override-missed'>): void {
  // A reason this build doesn't know (main and renderer out of step) reads as none.
  const miss = event.reason && Object.hasOwn(MISSED_TOASTS, event.reason) ? MISSED_TOASTS[event.reason] : UNEXPLAINED_MISS;
  if (miss.oncePerVersion) {
    const version = `${event.overrideId}${VERSION_SEPARATOR}${useOverrideStore.getState().byId[event.overrideId]?.updatedAt ?? ''}`;
    if (toldOnce.has(version)) return;
    toldOnce.add(version);
  }
  toast({
    id: `${OVERRIDE_MISSED_TOAST_ID_PREFIX}${event.overrideId}`,
    title: miss.title(fileName(event.url)),
    description: miss.description,
    tone: 'warning',
    ...(miss.reload ? { action: { label: 'Reload page', onClick: () => void reloadPage() } } : {}),
    duration: OVERRIDE_MISSED_TOAST_MS,
  });
}
