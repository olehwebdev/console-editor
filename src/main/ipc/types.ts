import type { BrowserWindow } from 'electron';
import type { PageController } from '../PageController';
import type { OverrideStore } from '../store/OverrideStore';
import type { SessionStore } from '../store/SessionStore';
import type { SettingsStore } from '../store/SettingsStore';
import type { UpdateService } from '../update/UpdateService';

export interface IpcDeps {
  win: BrowserWindow;
  page: PageController;
  store: OverrideStore;
  settings: SettingsStore;
  session: SessionStore;
  updates: UpdateService;
  /** The renderer answered a `flush-session` event. */
  onSessionFlushed(ok: boolean): void;
}
