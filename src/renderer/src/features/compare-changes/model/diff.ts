import { create } from 'zustand';
import { api, errorMessage } from '@/shared/api';
import { fileName, formatCode, looksMinified } from '@/shared/lib';
import { languageFor, monaco } from '@/shared/monaco';
import { toast } from '@/shared/ui/toast';
import { getTabBase, getTabModel, setTabBase, useTabStore, type TabMeta } from '@/entities/editor-tab';

/** The left side of the diff. Owned here and disposed when the diff closes. */
interface DiffSource {
  original: monaco.editor.ITextModel | null;
  label: string;
}

export const useDiffSource = create<DiffSource>()(() => ({ original: null, label: '' }));

/**
 * Bumped by every diff request, tab switch and closed diff. A fetch that
 * resolves after that belongs to a request the user moved away from.
 */
let generation = 0;

function isCurrent(request: number, tabId: string): boolean {
  const { activeId, tabs } = useTabStore.getState();
  return request === generation && activeId === tabId && tabs.some((t) => t.id === tabId);
}

function setOriginal(text: string, tab: TabMeta, label: string): void {
  const previous = useDiffSource.getState().original;
  useDiffSource.setState({ original: monaco.editor.createModel(text, languageFor(tab.kind, text.length)), label });
  // After React has attached the new model: the diff editor errors if a model it shows is disposed.
  if (previous) setTimeout(() => previous.dispose(), 0);
}

// Switching tabs or closing the diff resets the store's diff mode; free the left model then.
useTabStore.subscribe((state, prev) => {
  if (state.activeId !== prev.activeId) generation++;
  if (state.diff === 'off' && prev.diff !== 'off') {
    generation++;
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
  const request = ++generation;
  try {
    let base = getTabBase(tab.id);
    if (base === undefined && tab.overrideId) {
      base = await api.getOverrideBase(tab.overrideId);
      setTabBase(tab.id, base);
    }
    const model = getTabModel(tab.id);
    if (!model || !isCurrent(request, tab.id)) return;
    setOriginal(base ?? model.getValue(), tab, 'Where you started');
    useTabStore.getState().setDiff('base');
  } catch (err) {
    toast({ title: 'Could not load the original', description: errorMessage(err), tone: 'danger' });
  }
}

/** Diff against the file the server sends right now. */
export async function compareWithLive(tabId: string | null = useTabStore.getState().activeId): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab) return;
  const request = ++generation;
  const pending = toast({ title: `Fetching the live ${fileName(tab.url)}…`, duration: 0 });
  try {
    const res = await api.getResourceContent(tab.url);
    const text = looksMinified(res.content) ? await formatCode(res.content, tab.kind).catch(() => res.content) : res.content;
    toast.dismiss(pending);
    if (!getTabModel(tab.id) || !isCurrent(request, tab.id)) return;
    setOriginal(text, tab, 'Live file now');
    useTabStore.getState().setDiff('live');
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
