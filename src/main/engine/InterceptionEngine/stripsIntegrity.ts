import type { Override, ResourceKind, Settings } from '../../../shared/types';

/** The kinds an SRI hash can refuse once edited: a page's `integrity` attributes cover scripts and stylesheets only. */
const HASH_CHECKED: Record<ResourceKind, boolean> = { Script: true, Stylesheet: true, Document: false, Fetch: false };

/**
 * Whether documents get their SRI attributes stripped: only while an edited
 * script or stylesheet could be refused for its hash. A document that pauses
 * for a rule alone is never read for it, so a rule that changes nothing costs
 * no body read.
 */
export function stripsIntegrity(overrides: readonly Override[], settings: Settings): boolean {
  return settings.stripIntegrity && overrides.some((o) => o.enabled && HASH_CHECKED[o.kind]);
}
