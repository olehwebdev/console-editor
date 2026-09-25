import { api, onAppEvent } from '@/shared/api';
import { useActionStore } from '@/entities/action';
import { useFrameStore } from '@/entities/frame';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';
import { handleActionsWindowEvent } from './handleActionsWindowEvent';

/**
 * The Actions window's link to the main process: the actions, the page's
 * frames, the workspace's frame names and the settings its panel shows. Returns
 * a cleanup.
 */
export async function startActionsWindowBridge(): Promise<() => void> {
  const off = onAppEvent(handleActionsWindowEvent);
  // Each snapshot is applied as its reply arrives, in order with the events around it (one handled after it is newer).
  await Promise.all([
    api.getSettings().then((settings) => useSettingsStore.getState().setSettings(settings)),
    api.getWorkspaces().then((workspaces) => useWorkspaceStore.getState().setAll(workspaces)),
    api.listFrames().then((frames) => useFrameStore.getState().setAll(frames)),
    api.listActions().then((actions) => useActionStore.getState().setAll(actions)),
    api.getActionsWindow().then((window) => useActionStore.getState().setWindow(window)),
  ]);
  return off;
}
