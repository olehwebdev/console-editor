import { useTabStore } from '@/entities/editor-tab';
import { useHeldStore } from '@/entities/held-request';
import { findHeldTab } from './findHeldTab';
import { openHeld } from './openHeld';

/** Brings a held request's tab to the front, opening it again if it was closed with its workspace. */
export function showHeld(heldId: string): void {
  const tab = findHeldTab(heldId);
  if (tab) return useTabStore.getState().activate(tab.id);
  const held = useHeldStore.getState().held.find((h) => h.id === heldId);
  if (held) void openHeld(held);
}
