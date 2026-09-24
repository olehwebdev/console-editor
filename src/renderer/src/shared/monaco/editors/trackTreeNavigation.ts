import { KEY } from '@/shared/config';
import { TREE_SELECTOR } from './constants';
import { editorState } from './editorState';

/**
 * Follows the user's input, so an open that finishes while they arrow
 * through a tree (the Explorer) leaves focus there, while the click or
 * Enter/Space that opened a file still hands it to the editor.
 */
export function trackTreeNavigation(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const inTree = event.target instanceof Element && !!event.target.closest(TREE_SELECTOR);
    editorState.navigatingTree = inTree && event.key !== KEY.enter && event.key !== KEY.space;
  };
  const onPointerDown = () => {
    editorState.navigatingTree = false;
  };
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('pointerdown', onPointerDown, true);
  return () => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('pointerdown', onPointerDown, true);
    editorState.navigatingTree = false;
  };
}
