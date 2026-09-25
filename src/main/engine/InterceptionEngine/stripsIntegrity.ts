import type { Override, Settings } from '../../../shared/types';
import { DOCUMENT_KIND } from './constants';

/**
 * Whether documents get their SRI attributes stripped: only while an edited
 * script or stylesheet could be refused for its hash. A document that pauses
 * for a rule alone is never read for it, so a rule that changes nothing costs
 * no body read.
 */
export function stripsIntegrity(overrides: readonly Override[], settings: Settings): boolean {
  return settings.stripIntegrity && overrides.some((o) => o.enabled && o.kind !== DOCUMENT_KIND);
}
