import type { HeldRequest } from '@common/types';
import { useHeldStore } from '@/entities/held-request';
import { dropHeld } from './dropHeld';
import { openHeld } from './openHeld';

/** Takes the main process's list of held requests: a new one opens its tab, one gone closes its tab. */
export function receiveHeld(held: HeldRequest[]): void {
  const before = useHeldStore.getState().held;
  useHeldStore.getState().setAll(held);
  const now = new Set(held.map((h) => h.id));
  for (const gone of before) if (!now.has(gone.id)) dropHeld(gone);
  const known = new Set(before.map((h) => h.id));
  for (const arrived of held) if (!known.has(arrived.id)) void openHeld(arrived);
}
