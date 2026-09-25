import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import type { TabMeta } from '@/entities/editor-tab';
import { sendHeld } from '@/features/network/held';
import { saveTab } from '@/features/save-override';

/** Save for the active file tab: creates or saves its override, or sends the request a held tab shows. */
export function saveItem(active: TabMeta): CommandItem {
  if (active.held) return { id: 'save', label: 'Send the held request', icon: icons.SendIcon, shortcut: SHORTCUT.save, onSelect: () => void sendHeld(active.id) };
  return { id: 'save', label: active.overrideId ? 'Save override' : 'Create override from this file', icon: icons.SaveIcon, shortcut: SHORTCUT.save, onSelect: () => void saveTab() };
}
