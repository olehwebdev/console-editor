import type { BrowserWindow } from 'electron';
import type { PageController } from '../PageController';
import type { OverrideStore } from '../store/OverrideStore';
import type { RuleStore } from '../store/RuleStore';
import type { SessionStore } from '../store/SessionStore';
import type { SettingsStore } from '../store/SettingsStore';
import type { UpdateService } from '../update/UpdateService';
import type { WorkspaceController } from '../WorkspaceController';

export interface IpcDeps {
  win: BrowserWindow;
  page: PageController;
  store: OverrideStore;
  rules: RuleStore;
  settings: SettingsStore;
  session: SessionStore;
  workspaces: WorkspaceController;
  updates: UpdateService;
  /** The renderer answered a `flush-session` event. */
  onSessionFlushed(ok: boolean): void;
}
