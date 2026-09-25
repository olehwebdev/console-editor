import type { monaco } from '../setup';
import { editorState } from './editorState';
import { focusWhenFree } from './focusWhenFree';
import { revealPosition } from './revealPosition';

/**
 * Puts the cursor at `position` in `model` (a jump's target): at once when the active editor shows
 * it, else when the code editor next shows it, after the model's saved scroll position is restored.
 */
export function requestReveal(model: monaco.editor.ITextModel, position: monaco.IPosition): void {
  const editor = editorState.active;
  if (editor?.getModel() === model) {
    editorState.revealRequest = null;
    revealPosition(editor, position);
    focusWhenFree(editor);
    return;
  }
  editorState.revealRequest = { model, position };
}
