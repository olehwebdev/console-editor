import { editorHasFocus, triggerInActiveEditor } from '@/shared/monaco';
import { EDIT_COMMAND_TARGETS } from './constants';
import type { EditMenuCommand } from './types';

/** Undo, redo or select all in Monaco when it has focus, else in the focused native field (the address bar, a setting). */
export function runEditCommand(command: EditMenuCommand): void {
  const { editorHandler, execCommand } = EDIT_COMMAND_TARGETS[command];
  if (editorHasFocus()) triggerInActiveEditor(editorHandler);
  else document.execCommand(execCommand);
}
