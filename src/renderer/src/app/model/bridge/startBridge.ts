import { api, onAppEvent } from '@/shared/api';
import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { useResourceStore } from '@/entities/resource';
import { useSettingsStore } from '@/entities/settings';
import { startUpdates } from '@/features/update-app';
import type { PageCommands } from '@/pages/editor';
import { restoreSession, startSessionSync } from '../session';
import { pageCommands } from './commands/pageCommands';
import { handleAppEvent } from './handleAppEvent';
import { flushResourceOps } from './resources/flushResourceOps';

/** Loads the initial state and starts routing events, menu commands to `commands`. Returns a cleanup. */
export async function startBridge(commands: PageCommands): Promise<() => void> {
  pageCommands.current = commands;
  const off = onAppEvent(handleAppEvent);
  const [settings, overrides, resources, page] = await Promise.all([
    api.getSettings(),
    api.listOverrides(),
    api.listResources(),
    api.getPageState(),
  ]);
  useSettingsStore.getState().setSettings(settings);
  useOverrideStore.getState().setAll(overrides);
  // Events queued while loading are older than this snapshot.
  flushResourceOps();
  useResourceStore.getState().addMany(resources);
  usePageStore.getState().setPage(page);

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
