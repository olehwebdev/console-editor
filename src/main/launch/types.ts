import type { AppEvent } from '../../shared/types';
import type { OverrideStore } from '../store/OverrideStore';
import type { PageWindowStore } from '../store/PageWindowStore';
import type { RuleStore } from '../store/RuleStore';
import type { SessionStore } from '../store/SessionStore';
import type { SettingsStore } from '../store/SettingsStore';
import type { CloseGuard } from './CloseGuard';

/** The stores in the app's data folder, loaded. */
export interface AppStores {
  store: OverrideStore;
  rules: RuleStore;
  settings: SettingsStore;
  session: SessionStore;
  pageWindow: PageWindowStore;
  /** The folder held data before the stores looked (an earlier version ran). */
  hadData: boolean;
}

/** What the updater is made from. */
export interface UpdaterDeps {
  /** A local update server standing in for GitHub (tests). */
  updateFeed: string | undefined;
  userData: string;
  hadData: boolean;
  settings: SettingsStore;
  send(event: AppEvent): void;
  closing: CloseGuard;
}
