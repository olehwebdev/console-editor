import { toCdpUrlPattern } from '../../../shared/matcher';
import type { Breakpoint, Override, ResourceKind, Rule, Settings } from '../../../shared/types';
import { RULE_ACTION_SPECS } from '../rules/constants';
import { ANY_URL, BREAKPOINT_PAUSE_STAGE, DOCUMENT_KIND, OTHER_RESOURCE_TYPE, SCRIPT_KIND, XHR_RESOURCE_TYPE } from './constants';
import { sendsRequest } from './sendsRequest';
import { stripsIntegrity } from './stripsIntegrity';
import type { FetchPattern } from './types';

/** Joins a pattern's stage, URL and resource type into the key patterns are deduplicated by. */
const KEY_SEPARATOR = '|';

/** The CDP resource type a regex override of each kind pauses: a response override's fetch() and XHR are both `XHR`. */
const PATTERN_TYPE: Record<ResourceKind, string> = { Document: 'Document', Script: 'Script', Stylesheet: 'Stylesheet', Fetch: XHR_RESOURCE_TYPE };

/**
 * Pauses only the requests that an override, SRI stripping or a rule could
 * apply to. Exact/glob overrides get a precise URL pattern; regex overrides
 * fall back to "every request of this resource type" (`XHR` for a response
 * override: fetch() and XHR are both paused as that). Workers load scripts
 * as `Other` too (a worker's first script, static module imports), so script
 * overrides also pause those.
 *
 * Rules pause at their action's stage (blocks before the request is sent) and
 * never carry a resource type: CDP's type filters differ between Chromium
 * versions, and some types can't be filtered on at all, so the rule's type
 * filter runs only in the handler, where it can't disagree with the pattern.
 * The stage is part of the key, so a block rule and an override of one URL
 * both keep their pattern (the request then pauses twice).
 */
export function computeFetchPatterns(overrides: Override[], rules: readonly Rule[], settings: Settings, breakpoints: readonly Breakpoint[] = []): FetchPattern[] {
  const patterns = new Map<string, FetchPattern>();
  const add = (p: FetchPattern) => patterns.set([p.requestStage, p.urlPattern, p.resourceType ?? ''].join(KEY_SEPARATOR), p);
  for (const o of overrides.filter((o) => o.enabled)) {
    const urlPattern = toCdpUrlPattern(o.match);
    // A response override that isn't sent answers fetch() and XHR (and their preflights) before they go out.
    if (!sendsRequest(o)) {
      add({ urlPattern, resourceType: XHR_RESOURCE_TYPE, requestStage: 'Request' });
      continue;
    }
    if (urlPattern !== ANY_URL) {
      add({ urlPattern, requestStage: 'Response' });
      continue;
    }
    add({ urlPattern, resourceType: PATTERN_TYPE[o.kind], requestStage: 'Response' });
    if (o.kind === SCRIPT_KIND) add({ urlPattern, resourceType: OTHER_RESOURCE_TYPE, requestStage: 'Response' });
  }
  if (stripsIntegrity(overrides, settings)) {
    add({ urlPattern: ANY_URL, resourceType: DOCUMENT_KIND, requestStage: 'Response' });
  }
  for (const rule of rules) {
    // An action this build doesn't know (a newer version's, kept in rules.json) pauses nothing.
    if (!rule.enabled || !Object.hasOwn(RULE_ACTION_SPECS, rule.action)) continue;
    add({ urlPattern: toCdpUrlPattern(rule.match), requestStage: RULE_ACTION_SPECS[rule.action].stage });
  }
  // Breakpoints stop the page's fetch() and XHR only (Chromium pauses both as XHR).
  for (const b of breakpoints.filter((b) => b.enabled)) {
    add({ urlPattern: toCdpUrlPattern(b.match), resourceType: XHR_RESOURCE_TYPE, requestStage: BREAKPOINT_PAUSE_STAGE[b.stage] });
  }
  return [...patterns.values()];
}
