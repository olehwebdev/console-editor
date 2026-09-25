import type { BrowserWindow } from 'electron';
import type { AppEvent } from '../../shared/types';
import type { ActionsWindow } from '../ActionsWindow';
import type { PageController } from '../PageController';
import type { ActionStore } from '../store/ActionStore';
import type { OverrideStore } from '../store/OverrideStore';
import type { RuleStore } from '../store/RuleStore';
import type { SessionStore } from '../store/SessionStore';
import type { SettingsStore } from '../store/SettingsStore';
import type { SourceMapFileStore } from '../store/SourceMapFileStore';
import type { UpdateService } from '../update/UpdateService';
import type { WorkspaceController } from '../WorkspaceController';

/** Registers an IPC handler that only the allowed UI may call (each channel's handler takes its own arguments). */
export type IpcHandle = (channel: string, fn: (...args: any[]) => unknown) => void;

export interface IpcDeps {
  win: BrowserWindow;
  page: PageController;
  store: OverrideStore;
  rules: RuleStore;
  settings: SettingsStore;
  session: SessionStore;
  actions: ActionStore;
  sourceMaps: SourceMapFileStore;
  /** Where the Actions panel is; its own window's UI may use the action channels too. */
  actionsWindow: ActionsWindow;
  workspaces: WorkspaceController;
  updates: UpdateService;
  /** Pushes an event to the editor's UI. */
  send(event: AppEvent): void;
  /** The renderer answered a `flush-session` event. */
  onSessionFlushed(ok: boolean): void;
}
