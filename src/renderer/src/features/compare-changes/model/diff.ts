import { create } from 'zustand';
import { api, errorMessage } from '@/shared/api';
import { fileName, formatCode, looksMinified } from '@/shared/lib';
import { languageFor, monaco } from '@/shared/monaco';
import { toast } from '@/shared/ui/toast';
import { getTabBase, getTabModel, setTabBase, useTabStore } from '@/entities/editor-tab';

/** The left side of the diff. Owned here and disposed when the diff closes. */
interface DiffSource {
  original: monaco.editor.ITextModel | null;
  label: string;
}

export const useDiffSource = create<DiffSource>()(() => ({ original: null, label: '' }));

function setOriginal(text: string, tabId: string, label: string): void {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab) return;
  useDiffSource.getState().original?.dispose();
  useDiffSource.setState({ original: monaco.editor.createModel(text, languageFor(tab.kind, text.length)), label });
}

// Switching tabs or closing the diff resets the store's diff mode; free the left model then.
useTabStore.subscribe((state, prev) => {
  if (state.diff === 'off' && prev.diff !== 'off') {
    const { original } = useDiffSource.getState();
    useDiffSource.setState({ original: null, label: '' });
    // After React has swapped the diff editor out.
    setTimeout(() => original?.dispose(), 0);
  }
});

/** Diff against the text editing started from (fetched lazily for overrides). */
export async function showBaseDiff(tabId: string | null = useTabStore.getState().activeId): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab || !getTabModel(tab.id)) return;
  try {
    let base = getTabBase(tab.id);
    if (base === undefined && tab.overrideId) {
      base = await api.getOverrideBase(tab.overrideId);
      setTabBase(tab.id, base);
    }
    setOriginal(base ?? getTabModel(tab.id)!.getValue(), tab.id, 'Where you started');
    useTabStore.getState().setDiff('base');
  } catch (err) {
    toast({ title: 'Could not load the original', description: errorMessage(err), tone: 'danger' });
  }
}

/** Diff against the file the server sends right now. */
export async function compareWithLive(tabId: string | null = useTabStore.getState().activeId): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab) return;
  const pending = toast({ title: `Fetching the live ${fileName(tab.url)}…`, duration: 0 });
  try {
    const res = await api.getResourceContent(tab.url);
    const text = looksMinified(res.content) ? await formatCode(res.content, tab.kind).catch(() => res.content) : res.content;
    setOriginal(text, tab.id, 'Live file now');
    useTabStore.getState().setDiff('live');
    toast.dismiss(pending);
  } catch (err) {
    toast.update(pending, { title: 'Could not fetch the live file', description: errorMessage(err), tone: 'danger', duration: 5000 });
  }
}

export function closeDiff(): void {
  useTabStore.getState().setDiff('off');
}

export function toggleBaseDiff(): void {
  if (useTabStore.getState().diff !== 'off') closeDiff();
  else void showBaseDiff();
}
