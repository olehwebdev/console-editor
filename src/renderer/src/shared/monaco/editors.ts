import type { monaco } from './setup';

/**
 * Registry of live editor instances (non-serializable, so they stay out of
 * stores). Commands like undo or "focus editor" go to the active one.
 */
let active: monaco.editor.ICodeEditor | null = null;

export function setActiveEditor(editor: monaco.editor.ICodeEditor | null): void {
  active = editor;
}

export function getActiveEditor(): monaco.editor.ICodeEditor | null {
  return active;
}

export function editorHasFocus(): boolean {
  return !!active?.hasTextFocus();
}

export function triggerInActiveEditor(handlerId: string): void {
  active?.trigger('command', handlerId, null);
}
