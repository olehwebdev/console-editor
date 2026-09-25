import { useActionStore } from '@/entities/action';
import { useFrameStore } from '@/entities/frame';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';
import type { ActionsWindowEventHandlers } from './types';

/** What each event does in the Actions window: it keeps the stores its panel reads as the main process's. */
export const ACTIONS_WINDOW_EVENT_HANDLERS: ActionsWindowEventHandlers = {
  'actions-changed': (event) => useActionStore.getState().setAll(event.actions),
  'actions-window': (event) => useActionStore.getState().setWindow(event.state),
  'frames-changed': (event) => useFrameStore.getState().setAll(event.frames),
  'settings-changed': (event) => useSettingsStore.getState().setSettings(event.settings),
  'workspaces-changed': (event) => useWorkspaceStore.getState().setAll(event.state),
};
