import { getActiveEditor, type monaco } from '@/shared/monaco';

const START: monaco.IPosition = { lineNumber: 1, column: 1 };

/** Where the cursor is in `model`: the active editor's, if it shows it, else its first line. */
export function cursorOf(model: monaco.editor.ITextModel): monaco.IPosition {
  const editor = getActiveEditor();
  return (editor?.getModel() === model && editor.getPosition()) || START;
}
