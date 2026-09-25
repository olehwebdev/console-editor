import { validateHeldAction } from '@common/breakpoints';
import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { useTabStore } from '@/entities/editor-tab';
import { HELD_SEND_ACTIONS } from './heldSendActions';
import { heldEdits } from './heldEdits';
import { resumeHeld } from './resumeHeld';

/** Send (Ctrl/Cmd+S on a held tab): the request goes out as edited, or the page gets the edited response. */
export async function sendHeld(tabId: string | null = useTabStore.getState().activeId): Promise<void> {
  const edits = heldEdits(tabId);
  if (!edits) return;
  const action = HELD_SEND_ACTIONS[edits.held.stage](edits);
  const problem = validateHeldAction(action);
  if (problem) {
    toast({ title: `Can't send ${fileName(edits.held.url)}`, description: problem, tone: 'warning' });
    return;
  }
  await resumeHeld(edits.held.id, action);
}
