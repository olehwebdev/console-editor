import type { AppEvent, DrivenTab } from '../../../shared/types';
import type { PageInterception } from '../../engine/PageInterception';
import type { PageTransport } from '../../engine/websocketTransport';
import type { OverrideStore } from '../../store/OverrideStore';
import type { RuleStore } from '../../store/RuleStore';
import type { SettingsStore } from '../../store/SettingsStore';
import type { FoundBrowser } from '../types';

/** What a driven browser's tabs are served: the active workspace's overrides and rules, and the settings. */
export interface InterceptionSources {
  store: OverrideStore;
  rules: RuleStore;
  settings: SettingsStore;
}

/** A tab of a driven browser, with the interception serving it. */
export interface DrivenTabState {
  info: DrivenTab;
  sessionId: string;
  transport: PageTransport;
  interception: PageInterception;
  /** Settles once its interception is set up (or couldn't be) and the tab runs. */
  ready: Promise<void>;
}

/** What `Target.attachedToTarget` and `Target.targetInfoChanged` say of a target, as far as a tab needs. */
export interface PageTargetInfo {
  targetId: string;
  type: string;
  url: string;
  title: string;
}

export interface AttachedPage {
  sessionId: string;
  targetInfo: PageTargetInfo;
}

export interface DrivenChromiumDeps {
  sources: InterceptionSources;
  /** A tab opened, closed, or changed its address or title. */
  changed(): void;
  /** The browser went away (it was quit). */
  closed(): void;
}

export interface DrivenBrowsersDeps {
  /** Where the browsers are found. */
  registry: { get(id: string): Promise<FoundBrowser> };
  sources: InterceptionSources;
  /** The app's data folder, where driven browsers keep their profiles. */
  userData: string;
  send(event: AppEvent): void;
}
