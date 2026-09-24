import type { monaco } from '../setup';
import { editorState } from './editorState';

/** Whether focus was requested for `model`; clears the request. */
export function takeFocusRequest(model: monaco.editor.ITextModel | null): boolean {
  const requested = !!model && editorState.focusRequest === model;
  editorState.focusRequest = null;
  return requested;
}
