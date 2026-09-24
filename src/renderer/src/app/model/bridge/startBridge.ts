import { api, onAppEvent } from '@/shared/api';
import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';
import { startUpdates } from '@/features/update-app';
import type { PageCommands, PageSession } from '@/pages/editor';
import { pageCommands } from './commands/pageCommands';
import { handleAppEvent } from './handleAppEvent';
import { pageSession } from './pageSession';
import { applyResourceSnapshot } from './resources/applyResourceSnapshot';

/**
 * Loads the initial state and starts routing events, menu commands to
 * `commands`; reopens `session` and keeps it synced. Returns a cleanup.
 */
export async function startBridge(commands: PageCommands, session: PageSession): Promise<() => void> {
  pageCommands.current = commands;
  pageSession.current = session;
  // Stays subscribed even if loading fails: the main process still needs its flush-session answered to close.
  const off = onAppEvent(handleAppEvent);
  // Each snapshot is applied as its reply arrives, in order with the events around it:
  // one handled after that reply is newer, and must not be overwritten by it.
  await Promise.all([
    api.getSettings().then((settings) => useSettingsStore.getState().setSettings(settings)),
    api.getWorkspaces().then((workspaces) => useWorkspaceStore.getState().setAll(workspaces)),
    api.getWorkspaceFavicons().then((favicons) => useWorkspaceStore.getState().setFavicons(favicons)),
    api.listOverrides().then((overrides) => useOverrideStore.getState().setAll(overrides)),
    api.listResources().then(applyResourceSnapshot),
    api.getPageState().then((page) => usePageStore.getState().setPage(page)),
  ]);

  // Unsaved edits are kept as drafts rather than guarded: closing never asks to discard them.
  let stopSync: (() => void) | undefined;
  let stopped = false;
  void session
    .restore()
    .catch(() => undefined)
    .then(() => {
      if (stopped) return;
      stopSync = session.startSync();
      // After the tabs are back, so that What's New (opened right after an update) is the one in front.
      void startUpdates().catch(() => undefined);
    });
  return () => {
    stopped = true;
    off();
    stopSync?.();
  };
}
