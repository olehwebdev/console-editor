import { fileName } from '@/shared/lib';
import { confirm } from '@/shared/ui/dialog';
import { disposeTabModel, useTabStore } from '@/entities/editor-tab';

/** Closes a tab, asking first when it has unsaved edits. */
export async function closeTab(tabId: string): Promise<void> {
  const { tabs, sources, pages, remove } = useTabStore.getState();
  if (pages.some((p) => p.id === tabId)) {
    remove(tabId);
    return;
  }
  // An original is read-only: nothing to lose.
  if (sources.some((t) => t.id === tabId)) {
    remove(tabId);
    setTimeout(() => disposeTabModel(tabId), 0);
    return;
  }
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;
  if (tab.dirty) {
    const ok = await confirm({
      title: `Discard your edits to ${fileName(tab.url)}?`,
      body: 'They have not been saved as an override.',
      confirmLabel: 'Discard',
      tone: 'danger',
    });
    if (!ok) return;
  }
  useTabStore.getState().remove(tabId);
  // After React has moved the editor to another model.
  setTimeout(() => disposeTabModel(tabId), 0);
}
