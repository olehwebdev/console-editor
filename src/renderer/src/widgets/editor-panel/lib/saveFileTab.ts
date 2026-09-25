import { selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { sendHeld } from '@/features/network/held';
import { saveTab } from '@/features/save-override';

/** Save on the active file tab (Ctrl/Cmd+S): saves it as an override, or sends the request a held tab shows. */
export function saveFileTab(): void {
  const tab = selectActiveTab(useTabStore.getState());
  if (tab?.held) void sendHeld(tab.id);
  // Called without the id: saveTab saves the active tab.
  else void saveTab();
}
