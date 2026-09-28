import { CDP_DOMAINS } from './cdpDomains';
import { CDP_TARGETS } from './cdpTargets';

/**
 * The Chrome DevTools Protocol commands and events the engine uses, keyed by
 * domain and name as the protocol spells them: `CDP.Fetch.enable` is `Fetch.enable`.
 */
export const CDP = { ...CDP_DOMAINS, ...CDP_TARGETS } as const;
