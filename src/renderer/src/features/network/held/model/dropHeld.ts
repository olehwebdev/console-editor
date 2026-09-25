import type { HeldRequest } from '@common/types';
import { TOAST_DURATION } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { closeHeldTab } from './closeHeldTab';
import { findHeldTab } from './findHeldTab';
import { resuming } from './resuming';

/** Closes the tab of a request no longer held. Unless the user let it go, the page gave up on it: that is said. */
export function dropHeld(gone: HeldRequest): void {
  const open = !!findHeldTab(gone.id);
  closeHeldTab(gone.id);
  if (!open || resuming.has(gone.id)) return;
  toast({
    title: `The page gave up on ${gone.method} ${fileName(gone.url)}`,
    description: 'It stopped waiting (cancelled the request, or left the page), so nothing was sent.',
    tone: 'warning',
    duration: TOAST_DURATION.normal,
  });
}
