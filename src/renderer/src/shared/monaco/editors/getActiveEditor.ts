import type { monaco } from '../setup';
import { editorState } from './editorState';

export function getActiveEditor(): monaco.editor.ICodeEditor | null {
  return editorState.active;
}
