import type { monaco } from '../setup';

/** Puts the cursor at `position`, scrolled to the middle of the editor. */
export function revealPosition(editor: monaco.editor.ICodeEditor, position: monaco.IPosition): void {
  editor.setPosition(position);
  editor.revealPositionInCenter(position);
}
