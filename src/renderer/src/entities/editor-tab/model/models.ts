import type { ResourceKind } from '@common/types';
import { fileName } from '@/shared/lib';
import { languageFor, monaco } from '@/shared/monaco';
import { useTabStore } from './store';

interface Entry {
  model: monaco.editor.ITextModel;
  savedVersionId: number;
  /** Text editing started from (diff base); fetched lazily for overrides. */
  base?: string;
  disposeListener: monaco.IDisposable;
}

/** Monaco models per tab id. Kept out of the store because they aren't serializable. */
const entries = new Map<string, Entry>();
let nextId = 1;

export function newTabId(): string {
  return `tab-${nextId++}`;
}

/** Creates the tab's model and keeps the store's `dirty` flag in sync (updates only when it flips). */
export function createTabModel(tabId: string, url: string, kind: ResourceKind, text: string, base?: string): { lite: boolean } {
  const language = languageFor(kind, text.length);
  const uri = monaco.Uri.from({ scheme: 'inmemory', authority: 'tab', path: `/${tabId}/${fileName(url)}` });
  const model = monaco.editor.createModel(text, language, uri);
  const disposeListener = model.onDidChangeContent(() => {
    const entry = entries.get(tabId);
    if (!entry) return;
    const dirty = model.getAlternativeVersionId() !== entry.savedVersionId;
    const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
    if (tab && tab.dirty !== dirty) useTabStore.getState().patch(tabId, { dirty });
  });
  entries.set(tabId, { model, savedVersionId: model.getAlternativeVersionId(), base, disposeListener });
  return { lite: language !== languageFor(kind, 0) };
}

export function getTabModel(tabId: string | null | undefined): monaco.editor.ITextModel | null {
  return (tabId && entries.get(tabId)?.model) || null;
}

export function getTabBase(tabId: string): string | undefined {
  return entries.get(tabId)?.base;
}

export function setTabBase(tabId: string, base: string): void {
  const entry = entries.get(tabId);
  if (entry) entry.base = base;
}

/** Marks the text at `versionId` as saved. */
export function markTabSaved(tabId: string, versionId: number): void {
  const entry = entries.get(tabId);
  if (!entry) return;
  entry.savedVersionId = versionId;
  useTabStore.getState().patch(tabId, { dirty: entry.model.getAlternativeVersionId() !== versionId });
}

/** Replaces the whole text as one undoable edit. */
export function replaceTabText(tabId: string, text: string): void {
  const model = getTabModel(tabId);
  if (!model) return;
  model.pushStackElement();
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
  model.pushStackElement();
}

export function disposeTabModel(tabId: string): void {
  const entry = entries.get(tabId);
  if (!entry) return;
  entries.delete(tabId);
  entry.disposeListener.dispose();
  entry.model.dispose();
}
