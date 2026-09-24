import { useOverlayStore } from '@/shared/lib';
import type { monaco } from '../setup';
import { focusIsTaken } from './focusIsTaken';

/**
 * Focuses `editor` unless that would take focus from something in use: waits
 * while an overlay (palette, menu, dialog) is open, then gives up if focus
 * has meanwhile gone to another text field, the tab strip or a tree being
 * browsed by keyboard. Returns a canceller (call it when the editor moves on
 * to another model).
 */
export function focusWhenFree(editor: monaco.editor.ICodeEditor): () => void {
  const attempt = () => {
    if (!focusIsTaken()) editor.focus();
  };
  if (useOverlayStore.getState().open === 0) {
    attempt();
    return () => {};
  }
  const unsubscribe = useOverlayStore.subscribe((s) => {
    if (s.open > 0) return;
    unsubscribe();
    attempt();
  });
  return unsubscribe;
}
