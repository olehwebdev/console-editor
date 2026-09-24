import type { ResourceKind } from '@common/types';
import { fileName } from '@/shared/lib';
import { languageFor, monaco } from '@/shared/monaco';
import { useTabStore } from '../store';
import { editListeners } from './editListeners';
import { entries } from './entries';

/** Monaco's scheme for models that aren't files on disk; the authority keeps tab models apart from any others. */
const TAB_URI_SCHEME = 'inmemory';
const TAB_URI_AUTHORITY = 'tab';

/** Creates the tab's model and keeps the store's `dirty` flag in sync (updates only when it flips). */
export function createTabModel(tabId: string, url: string, kind: ResourceKind, text: string, base?: string): { lite: boolean } {
  const language = languageFor(kind, text.length);
  const uri = monaco.Uri.from({ scheme: TAB_URI_SCHEME, authority: TAB_URI_AUTHORITY, path: `/${tabId}/${fileName(url)}` });
  const model = monaco.editor.createModel(text, language, uri);
  const disposeListener = model.onDidChangeContent(() => {
    const entry = entries.get(tabId);
    if (!entry) return;
    const dirty = model.getAlternativeVersionId() !== entry.savedVersionId;
    const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
    if (tab && tab.dirty !== dirty) useTabStore.getState().patch(tabId, { dirty });
    for (const listener of editListeners) listener(tabId);
  });
  entries.set(tabId, { model, savedVersionId: model.getAlternativeVersionId(), base, disposeListener });
  return { lite: language !== languageFor(kind, 0) };
}
