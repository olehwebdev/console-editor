import { fileName } from '@/shared/lib';
import { confirm } from '@/shared/ui/dialog';
import { disposeTabModel, isPageDirty, useTabStore } from '@/entities/editor-tab';
import { letHeldGo } from './letHeldGo';

/** Closes a tab, an original or a page, asking first when it has unsaved edits (a rule page's unapplied ones). */
export async function closeTab(tabId: string): Promise<void> {
  const { tabs, sources, pages } = useTabStore.getState();
  const page = pages.find((p) => p.id === tabId);
  if (page) {
    if (isPageDirty(page)) {
      const ok = await confirm({
        title: `Discard your changes to ${page.title}?`,
        body: 'They have not been applied.',
        confirmLabel: 'Discard',
        tone: 'danger',
      });
      if (!ok) return;
    }
    useTabStore.getState().remove(tabId);
    return;
  }
  // An original is read-only: nothing to lose.
  if (sources.some((t) => t.id === tabId)) {
    useTabStore.getState().remove(tabId);
    setTimeout(() => disposeTabModel(tabId), 0);
    return;
  }
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;
  if (tab.held) return letHeldGo({ ...tab, held: tab.held });
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
