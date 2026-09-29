import type { Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { confirm } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';

/** Words for each kind in the question and notices. */
const KIND_NOUN: Record<Shot['kind'], string> = { capture: 'capture', design: 'design' };

/** Deletes a capture or design after confirmation (its page closes as `shots-changed` arrives). */
export async function deleteShot(shot: Pick<Shot, 'id' | 'name' | 'kind'>): Promise<void> {
  const ok = await confirm({ title: `Delete ${shot.name}?`, body: `The ${KIND_NOUN[shot.kind]} and its file are deleted.`, confirmLabel: 'Delete', tone: 'danger' });
  if (!ok) return;
  try {
    await api.deleteShot(shot.id);
    toast({ title: `Deleted ${shot.name}`, tone: 'neutral', duration: TOAST_DURATION.confirm });
  } catch (err) {
    toast({ title: `Could not delete ${shot.name}`, description: errorMessage(err), tone: 'danger' });
  }
}
