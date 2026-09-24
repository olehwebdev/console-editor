import type { monaco } from '../setup';
import { editorState } from './editorState';

export function setActiveEditor(editor: monaco.editor.ICodeEditor | null): void {
  editorState.active = editor;
}
