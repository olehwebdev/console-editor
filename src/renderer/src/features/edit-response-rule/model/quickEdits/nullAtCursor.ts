import { nullAt } from '@/shared/lib';
import { getActiveEditor } from '@/shared/monaco';
import { toast } from '@/shared/ui/toast';
import { getTabModel } from '@/entities/editor-tab';
import { editJsonText } from './editJsonText';

/** Null the value at the cursor: the value under the editor's cursor in this tab becomes null. */
export function nullAtCursor(tabId: string): void {
  const editor = getActiveEditor();
  const model = getTabModel(tabId);
  const position = editor?.getModel() === model ? editor?.getPosition() : null;
  if (!model || !position) {
    toast({ title: 'Put the cursor on a value first', description: 'The value under the cursor becomes null.', tone: 'neutral' });
    return;
  }
  const offset = model.getOffsetAt(position);
  editJsonText(tabId, (text) => nullAt(text, offset));
}
