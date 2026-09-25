import { api } from '@/shared/api';
import { fileName } from '@/shared/lib';
import { confirm } from '@/shared/ui/dialog';
import { disposeTabModel, useTabStore, type TabMeta } from '@/entities/editor-tab';

/** The action that lets a held request go as it would have. */
const CONTINUE = { type: 'continue' } as const;

/** Closes a held request's tab: the request goes on as it was (asking first when its body was edited). */
export async function letHeldGo(tab: TabMeta & { held: string }): Promise<void> {
  if (tab.dirty) {
    const ok = await confirm({
      title: `Send ${fileName(tab.url)} as it was?`,
      body: 'Closing the tab lets the request go without your edits.',
      confirmLabel: 'Send original',
    });
    if (!ok) return;
  }
  useTabStore.getState().remove(tab.id);
  // After React has moved the editor to another model.
  setTimeout(() => disposeTabModel(tab.id), 0);
  // Already let go (the page gave up on it) if this fails: nothing is left to do.
  await api.resumeHeldRequest(tab.held, CONTINUE).catch(() => undefined);
}
