import type { Session } from 'electron';
import type { AppEvent } from '../../shared/types';
import type { CdpTransport } from '../engine/cdp';
import { PageInterception, type SessionObserver } from '../engine/PageInterception';
import type { OverrideStore } from '../store/OverrideStore';
import type { RuleStore } from '../store/RuleStore';
import type { SettingsStore } from '../store/SettingsStore';
import { fetchUncached } from './fetchUncached';

/** What the page's interception reads on every request, and where it reports. */
export interface PageSources {
  store: OverrideStore;
  rules: RuleStore;
  settings: SettingsStore;
  send(event: AppEvent): void;
  /** Fetches live files (for the editor) through the site's session. */
  siteSession: Session;
}

/** The page's interception: the active workspace's overrides and rules, and the settings, as they are when each request pauses. */
export function interceptPage(transport: CdpTransport, sessions: SessionObserver, { store, rules, settings, send, siteSession }: PageSources): PageInterception {
  return new PageInterception({
    transport,
    sessions,
    getOverrides: () => store.list(),
    getRules: () => rules.list(),
    getSettings: () => settings.get(),
    emit: (event) => send(event),
    fallbackFetch: (url) => fetchUncached(siteSession, url),
  });
}
