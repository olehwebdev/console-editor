import { getTabModel } from './getTabModel';
import { markTabSaved } from './markTabSaved';
import { replaceTabText } from './replaceTabText';

/** Makes `text` the tab's saved text, as one undoable edit: undo brings back what it showed, unsaved. */
export function setTabSavedText(tabId: string, text: string): void {
  const model = getTabModel(tabId);
  if (!model) return;
  if (model.getValue() !== text) replaceTabText(tabId, text);
  markTabSaved(tabId, model.getAlternativeVersionId());
}
