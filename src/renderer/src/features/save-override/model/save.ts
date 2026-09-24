import { api, errorMessage } from '@/shared/api';
import { fileName } from '@/shared/lib';
import { dismissEditorWidgets } from '@/shared/monaco';
import { toast } from '@/shared/ui/toast';
import { getTabBase, getTabModel, markTabSaved, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';

/** A tab's running save, the model version it sends, and the one save queued behind it. */
interface SaveJob {
  task: Promise<void>;
  version: number | undefined;
  next?: Promise<void>;
}

const jobs = new Map<string, SaveJob>();

/**
 * Saves a tab: creates the override on first save, updates it afterwards, then
 * reloads the page (when enabled). Concurrent saves of one tab are coalesced:
 * saves requested while one runs share a single follow-up, which sends the
 * newer text if it changed. The content crosses IPC once; nothing is echoed back.
 */
export function saveTab(tabId: string | null = useTabStore.getState().activeId): Promise<void> {
  if (!tabId) return Promise.resolve();
  // An autocomplete list left open over the page would keep it frozen and hide the reload.
  dismissEditorWidgets();
  const job = jobs.get(tabId);
  if (!job) return startSave(tabId);
  job.next ??= job.task.then(() => (getTabModel(tabId)?.getAlternativeVersionId() === job.version ? undefined : startSave(tabId)));
  return job.next;
}

/** Resolves once the saves running now, and those queued behind them, have finished. */
export function savesSettled(): Promise<void> {
  return Promise.allSettled([...jobs.values()].map((job) => job.next ?? job.task)).then(() => undefined);
}

function startSave(tabId: string): Promise<void> {
  // doSave snapshots the model before its first await, so this is the version it sends.
  const version = getTabModel(tabId)?.getAlternativeVersionId();
  const task = doSave(tabId).finally(() => jobs.delete(tabId));
  jobs.set(tabId, { task, version });
  return task;
}

async function doSave(tabId: string): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  const model = getTabModel(tabId);
  if (!tab || !model) return;
  if (tab.overrideId && !tab.dirty) return;

  const content = model.getValue();
  const version = model.getAlternativeVersionId();
  const { patch } = useTabStore.getState();
  patch(tabId, { saving: true });
  try {
    if (tab.overrideId) {
      useOverrideStore.getState().upsert(await api.updateOverride(tab.overrideId, { content }));
    } else {
      const base = getTabBase(tabId);
      const created = await api.createOverride({
        kind: tab.kind,
        sourceUrl: tab.url,
        content,
        // The base is only sent when it differs; unchanged it would be a second copy of a large file.
        ...(base !== undefined && base !== content ? { base } : {}),
        originalHash: tab.originalHash,
      });
      useOverrideStore.getState().upsert(created);
      patch(tabId, { overrideId: created.id });
    }
    markTabSaved(tabId, version);
    const reload = useSettingsStore.getState().settings.autoReloadOnSave;
    toast({ title: `Saved ${fileName(tab.url)}`, description: reload ? 'Reloading the page with your version.' : undefined, tone: 'success', duration: 2500 });
    if (reload) await api.reload();
  } catch (err) {
    toast({ title: `Could not save ${fileName(tab.url)}`, description: errorMessage(err), tone: 'danger' });
  } finally {
    patch(tabId, { saving: false });
  }
}
