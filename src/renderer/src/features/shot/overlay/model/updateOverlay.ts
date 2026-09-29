import type { OverlaySettings } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useShotStore } from '@/entities/shot';
import { overlayUpdates } from './overlayUpdates';

/**
 * Changes how the design over the page shows: at once in the bar, then in the page. Changes made while one is on its
 * way (a slider dragged) are sent together once it lands, so the page isn't restyled for every step.
 */
export async function updateOverlay(patch: Partial<OverlaySettings>): Promise<void> {
  const { overlay, setOverlay } = useShotStore.getState();
  if (!overlay) return;
  setOverlay({ ...overlay, settings: { ...overlay.settings, ...patch } });
  overlayUpdates.pending = { ...overlayUpdates.pending, ...patch };
  if (overlayUpdates.sending) return;
  overlayUpdates.sending = true;
  try {
    while (overlayUpdates.pending) {
      const next = overlayUpdates.pending;
      overlayUpdates.pending = null;
      await api.updateOverlay(next);
    }
  } catch (err) {
    overlayUpdates.pending = null;
    toast({ title: 'Could not change the design over the page', description: errorMessage(err), tone: 'danger' });
  } finally {
    overlayUpdates.sending = false;
  }
}
