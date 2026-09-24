import type { monaco } from '../setup';
import { editorState } from './editorState';

/**
 * Asks the code editor to take focus when it next shows `model`: an explicit
 * open or switch. Without a request, a model swap leaves focus where it is
 * (say, on the tab strip after a keyboard close) unless the editor had it.
 * Any swap clears the request; see `focusWhenFree` for when it is honoured.
 */
export function requestEditorFocus(model: monaco.editor.ITextModel | null): void {
  editorState.focusRequest = model;
}
