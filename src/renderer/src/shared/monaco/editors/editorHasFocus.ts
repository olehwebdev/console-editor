import { editorState } from './editorState';

export function editorHasFocus(): boolean {
  return !!editorState.active?.hasTextFocus();
}
