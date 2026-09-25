import type { Session } from 'electron';
import type { AppEvent, Breakpoint } from '../../shared/types';
import type { CdpTransport } from '../engine/cdp';
import { PageInterception, type SessionObserver } from '../engine/PageInterception';
import type { NetworkLog } from '../network';
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
  /** Told what the engine did, to mark the requests an override answered; holds what breakpoints stop. */
  network: Pick<NetworkLog, 'engineEvent' | 'held'>;
  /** The active workspace's breakpoints. */
  breakpoints(): readonly Breakpoint[];
}

/** The page's interception: the active workspace's overrides and rules, and the settings, as they are when each request pauses. */
export function interceptPage(transport: CdpTransport, sessions: SessionObserver, { store, rules, settings, send, siteSession, network, breakpoints }: PageSources): PageInterception {
  return new PageInterception({
    transport,
    sessions,
    getOverrides: () => store.list(),
    getRules: () => rules.list(),
    getSettings: () => settings.get(),
    getBreakpoints: breakpoints,
    hold: (request, owner) => network.held.hold(request, owner),
    releaseHeld: (owner) => network.held.releaseOwner(owner),
    emit: (event) => {
      network.engineEvent(event);
      send(event);
    },
    fallbackFetch: (url) => fetchUncached(siteSession, url),
  });
}
