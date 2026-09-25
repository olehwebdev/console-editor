import type { monaco } from '../setup';
import { editorState } from './editorState';

/** Where a reveal was requested in `model`, if anywhere; clears any request. */
export function takeRevealRequest(model: monaco.editor.ITextModel | null): monaco.IPosition | null {
  const request = editorState.revealRequest;
  editorState.revealRequest = null;
  return request && request.model === model ? request.position : null;
}
