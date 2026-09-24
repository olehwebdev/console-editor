import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';

/** How long the demo save runs before its toast turns into "saved". */
const SAVE_FLOW_MS = 1200;

/** A pending toast that updates in place once the (pretend) save finishes. */
export function saveFlow() {
  const id = toast({ title: 'Saving override…', description: 'Writing main.js to disk', duration: TOAST_DURATION.pending });
  window.setTimeout(
    () => toast.update(id, { title: 'Override saved', description: 'Served on next reload', tone: 'success', duration: TOAST_DURATION.normal }),
    SAVE_FLOW_MS,
  );
}
