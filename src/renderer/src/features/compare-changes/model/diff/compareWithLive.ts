import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { fileName, formatCode, looksMinified } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { getTabModel, useTabStore } from '@/entities/editor-tab';
import { diffRequest } from './diffRequest';
import { isCurrent } from './isCurrent';
import { setOriginal } from './setOriginal';

/** Diff against the file the server sends right now. */
export async function compareWithLive(tabId: string | null = useTabStore.getState().activeId): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab) return;
  const request = ++diffRequest.generation;
  const pending = toast({ title: `Fetching the live ${fileName(tab.url)}…`, duration: TOAST_DURATION.pending });
  try {
    const res = await api.getResourceContent(tab.url);
    const text = looksMinified(res.content) ? await formatCode(res.content, tab.kind).catch(() => res.content) : res.content;
    toast.dismiss(pending);
    if (!getTabModel(tab.id) || !isCurrent(request, tab.id)) return;
    setOriginal(text, tab, 'Live file now');
    useTabStore.getState().setDiff('live');
  } catch (err) {
    toast.update(pending, { title: 'Could not fetch the live file', description: errorMessage(err), tone: 'danger', duration: TOAST_DURATION.failure });
  }
}
