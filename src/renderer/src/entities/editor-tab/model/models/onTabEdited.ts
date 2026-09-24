import { editListeners } from './editListeners';

/** Called after every edit of any tab's text (the store's `dirty` flag is already up to date). */
export function onTabEdited(listener: (tabId: string) => void): () => void {
  editListeners.add(listener);
  return () => editListeners.delete(listener);
}
