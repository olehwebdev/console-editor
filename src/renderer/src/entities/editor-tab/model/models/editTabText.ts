import type { TextEdit } from '@common/json';
import { getTabModel } from './getTabModel';

/** Changes ranges of a tab's text (offsets into its current text) as one undoable edit. */
export function editTabText(tabId: string, edits: readonly TextEdit[]): void {
  const model = getTabModel(tabId);
  if (!model || !edits.length) return;
  const range = (start: number, end: number) => {
    const from = model.getPositionAt(start);
    const to = model.getPositionAt(end);
    return { startLineNumber: from.lineNumber, startColumn: from.column, endLineNumber: to.lineNumber, endColumn: to.column };
  };
  model.pushStackElement();
  model.pushEditOperations([], edits.map((e) => ({ range: range(e.start, e.end), text: e.text })), () => null);
  model.pushStackElement();
}
