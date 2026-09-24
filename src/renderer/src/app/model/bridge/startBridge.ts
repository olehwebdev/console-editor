import { api, onAppEvent } from '@/shared/api';
import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { useSettingsStore } from '@/entities/settings';
import { startUpdates } from '@/features/update-app';
import type { PageCommands } from '@/pages/editor';
import { restoreSession, startSessionSync } from '../session';
import { pageCommands } from './commands/pageCommands';
import { handleAppEvent } from './handleAppEvent';
import { applyResourceSnapshot } from './resources/applyResourceSnapshot';

/** Loads the initial state and starts routing events, menu commands to `commands`. Returns a cleanup. */
export async function startBridge(commands: PageCommands): Promise<() => void> {
  pageCommands.current = commands;
  const off = onAppEvent(handleAppEvent);
  try {
    // Each snapshot is applied as its reply arrives, in order with the events around it:
    // one handled after that reply is newer, and must not be overwritten by it.
    await Promise.all([
      api.getSettings().then((settings) => useSettingsStore.getState().setSettings(settings)),
      api.listOverrides().then((overrides) => useOverrideStore.getState().setAll(overrides)),
      api.listResources().then(applyResourceSnapshot),
      api.getPageState().then((page) => usePageStore.getState().setPage(page)),
    ]);
  } catch (err) {
    // No cleanup reaches the caller, so stop routing here.
    off();
    throw err;
  }

  // Unsaved edits are kept as drafts rather than guarded: closing never asks to discard them.
  let stopSync: (() => void) | undefined;
  let stopped = false;
  void restoreSession()
    .catch(() => undefined)
    .then(() => {
      if (stopped) return;
      stopSync = startSessionSync();
      // After the tabs are back, so that What's New (opened right after an update) is the one in front.
      void startUpdates().catch(() => undefined);
    });
  return () => {
    stopped = true;
    off();
    stopSync?.();
  };
}
