import { TREE_SELECTOR } from './constants';
import { editorState } from './editorState';

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
/** The tab strip. */
const TAB_LIST_SELECTOR = '[role="tablist"]';
/** The root Monaco gives every editor it builds. */
const MONACO_EDITOR_SELECTOR = '.monaco-editor';

/** Focus is where the user is typing or navigating (another field, the tab strip, a tree by keyboard): moving it would lose keystrokes. */
export function focusIsTaken(): boolean {
  const el = document.activeElement;
  if (!el || el === document.body || el.closest(MONACO_EDITOR_SELECTOR)) return false;
  return el.matches(EDITABLE) || !!el.closest(TAB_LIST_SELECTOR) || (editorState.navigatingTree && !!el.closest(TREE_SELECTOR));
}
