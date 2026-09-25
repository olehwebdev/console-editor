import { RESPONSE_KIND } from '../../../shared/overrides';
import type { HeldAction } from '../../../shared/types';
import { applyHeaderEdits } from '../rules';
import { buildOverrideHeaders } from '../transform';
import { fulfillHeld } from './fulfillHeld';
import type { HeldActionApplier } from './types';

/** Response stage: answers the page with the user's status and body instead, the header changes applied to the response's headers (reframed for the new body). */
export const respondInstead: HeldActionApplier<Extract<HeldAction, { type: 'respond' }>> = async ({ cdp, opts }, p, { status, headers, body }) => {
  const base = buildOverrideHeaders(p.responseHeaders, RESPONSE_KIND, opts.getSettings());
  await fulfillHeld(cdp, p.requestId, { status, headers: applyHeaderEdits(base, headers) }, body);
  return true;
};
