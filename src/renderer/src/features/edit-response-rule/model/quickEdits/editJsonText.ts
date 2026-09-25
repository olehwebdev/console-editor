import type { TextEdit } from '@common/json';
import { errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { editTabText, getTabModel } from '@/entities/editor-tab';

/** Applies a quick edit to a response tab's JSON as one undoable edit; says so when the text isn't JSON or nothing changes. */
export function editJsonText(tabId: string, edit: (text: string) => TextEdit[]): void {
  const model = getTabModel(tabId);
  if (!model) return;
  let edits: TextEdit[];
  try {
    edits = edit(model.getValue());
  } catch (err) {
    toast({ title: 'Quick edits work on JSON', description: errorMessage(err), tone: 'warning' });
    return;
  }
  if (!edits.length) {
    toast({ title: 'Nothing to change', tone: 'neutral' });
    return;
  }
  editTabText(tabId, edits);
}
