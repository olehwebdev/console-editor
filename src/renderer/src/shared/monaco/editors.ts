import { useOverlayStore } from '@/shared/lib';
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

/**
 * Closes the active editor's floating widgets (suggestions, parameter hints,
 * hover). One left open over the page view keeps it frozen on a snapshot,
 * which would hide the reload that follows a save.
 */
export function dismissEditorWidgets(): void {
  for (const id of ['hideSuggestWidget', 'closeParameterHints', 'editor.action.hideHover']) triggerInActiveEditor(id);
}

let focusRequest: monaco.editor.ITextModel | null = null;

/**
 * Asks the code editor to take focus when it next shows `model`: an explicit
 * open or switch. Without a request, a model swap leaves focus where it is
 * (say, on the tab strip after a keyboard close) unless the editor had it.
 * Any swap clears the request; see `focusWhenFree` for when it is honoured.
 */
export function requestEditorFocus(model: monaco.editor.ITextModel | null): void {
  focusRequest = model;
}

/** Whether focus was requested for `model`; clears the request. */
export function takeFocusRequest(model: monaco.editor.ITextModel | null): boolean {
  const requested = !!model && focusRequest === model;
  focusRequest = null;
  return requested;
}

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** The user's latest input was keyboard navigation in a tree (arrows, type-ahead), not a click or Enter/Space. */
let navigatingTree = false;

/**
 * Follows the user's input, so an open that finishes while they arrow
 * through a tree (the Explorer) leaves focus there, while the click or
 * Enter/Space that opened a file still hands it to the editor.
 */
export function trackTreeNavigation(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const inTree = event.target instanceof Element && !!event.target.closest('[role="tree"]');
    navigatingTree = inTree && event.key !== 'Enter' && event.key !== ' ';
  };
  const onPointerDown = () => {
    navigatingTree = false;
  };
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('pointerdown', onPointerDown, true);
  return () => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('pointerdown', onPointerDown, true);
    navigatingTree = false;
  };
}

/** Focus is where the user is typing or navigating (another field, the tab strip, a tree by keyboard): moving it would lose keystrokes. */
function focusIsTaken(): boolean {
  const el = document.activeElement;
  if (!el || el === document.body || el.closest('.monaco-editor')) return false;
  return el.matches(EDITABLE) || !!el.closest('[role="tablist"]') || (navigatingTree && !!el.closest('[role="tree"]'));
}

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
