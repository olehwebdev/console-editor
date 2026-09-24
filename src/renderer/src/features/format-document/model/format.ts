import { errorMessage } from '@/shared/api';
import { formatCode } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { getTabModel, replaceTabText, useTabStore } from '@/entities/editor-tab';

/** Pretty-prints a tab as one undoable edit (runs in a worker). */
export async function formatTab(tabId: string | null = useTabStore.getState().activeId): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  const model = getTabModel(tabId);
  if (!tab || !model) return;
  const pending = toast({ title: 'Pretty-printing…', duration: 0 });
  const version = model.getAlternativeVersionId();
  try {
    const text = await formatCode(model.getValue(), tab.kind);
    if (getTabModel(tab.id) !== model) return toast.dismiss(pending);
    // Replacing the whole text now would wipe what was typed while the worker ran.
    if (model.getAlternativeVersionId() !== version) {
      toast.update(pending, { title: 'Not formatted', description: 'The file changed while it was being pretty-printed. Try again.', tone: 'warning', duration: 4000 });
      return;
    }
    replaceTabText(tab.id, text);
    toast.update(pending, { title: 'Formatted', description: 'Undo with Ctrl/Cmd+Z.', tone: 'success', duration: 2000 });
  } catch (err) {
    toast.update(pending, { title: 'Could not format', description: errorMessage(err), tone: 'danger', duration: 5000 });
  }
}
