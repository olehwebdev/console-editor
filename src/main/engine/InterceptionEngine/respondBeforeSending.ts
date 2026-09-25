import { RESPONSE_KIND } from '../../../shared/overrides';
import type { HeldAction } from '../../../shared/types';
import { applyCors, applyHeaderEdits } from '../rules';
import { buildOverrideHeaders } from '../transform';
import { fulfillHeld } from './fulfillHeld';
import type { HeldActionApplier } from './types';

/**
 * Request stage: answers the held request without sending it. No response came, so the header
 * changes apply to a JSON response's own (its type, no caching), allowing the page's origin to read it.
 */
export const respondBeforeSending: HeldActionApplier<Extract<HeldAction, { type: 'respond' }>> = async ({ cdp, opts }, p, { status, headers, body }, request) => {
  const base = buildOverrideHeaders(undefined, RESPONSE_KIND, opts.getSettings());
  await fulfillHeld(cdp, p.requestId, applyCors({ status, headers: applyHeaderEdits(base, headers) }, request), body);
  return true;
};
