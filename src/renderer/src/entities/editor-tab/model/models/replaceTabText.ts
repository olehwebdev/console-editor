import { getTabModel } from './getTabModel';

/** Replaces the whole text as one undoable edit. */
export function replaceTabText(tabId: string, text: string): void {
  const model = getTabModel(tabId);
  if (!model) return;
  model.pushStackElement();
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
  model.pushStackElement();
}
