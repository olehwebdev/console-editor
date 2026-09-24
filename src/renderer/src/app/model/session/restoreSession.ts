import { api } from '@/shared/api';
import { useTabStore } from '@/entities/editor-tab';
import { reopen } from './reopen';

/** Reopens the tabs (and their unsaved edits) of the last run. */
export async function restoreSession(): Promise<void> {
  const session = await api.getSession();
  for (const tab of session.tabs) await reopen(tab).catch(() => undefined);
  const { tabs, activate } = useTabStore.getState();
  const active = tabs.find((t) => t.id === session.activeTabId) ?? tabs.at(-1);
  if (active) activate(active.id);
}
