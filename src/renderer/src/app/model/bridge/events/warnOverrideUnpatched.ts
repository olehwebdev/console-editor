import { TOAST_DURATION } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { useOverrideStore } from '@/entities/override';
import type { AppEventOf } from '../types';
import { OVERRIDE_UNPATCHED_TOAST_ID_PREFIX } from './constants';
import { UNPATCHED_TOASTS } from './unpatchedToasts';

/** Versions of overrides (`id@updatedAt`, with the reason) already told: every response would say it again. */
const told = new Set<string>();

/** A patch-mode override answered with its saved text: says why, once per version of the override and reason. */
export function warnOverrideUnpatched(event: AppEventOf<'override-unpatched'>): void {
  if (!Object.hasOwn(UNPATCHED_TOASTS, event.reason)) return;
  const key = `${event.overrideId}@${useOverrideStore.getState().byId[event.overrideId]?.updatedAt ?? ''}:${event.reason}`;
  if (told.has(key)) return;
  told.add(key);
  const copy = UNPATCHED_TOASTS[event.reason];
  toast({ id: `${OVERRIDE_UNPATCHED_TOAST_ID_PREFIX}${event.overrideId}`, title: copy.title(fileName(event.url)), description: copy.description, tone: 'warning', duration: TOAST_DURATION.actionable });
}
