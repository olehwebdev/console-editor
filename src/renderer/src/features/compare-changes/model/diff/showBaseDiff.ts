import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { getTabBase, getTabModel, setTabBase, useTabStore } from '@/entities/editor-tab';
import { diffRequest } from './diffRequest';
import { isCurrent } from './isCurrent';
import { setOriginal } from './setOriginal';

/** Diff against the text editing started from (fetched lazily for overrides). */
export async function showBaseDiff(tabId: string | null = useTabStore.getState().activeId): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab || !getTabModel(tab.id)) return;
  const request = ++diffRequest.generation;
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
