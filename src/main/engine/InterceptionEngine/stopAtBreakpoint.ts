import type { BreakpointStage, HeldAction } from '../../../shared/types';
import { isPreflight, type PausedRequest } from '../rules';
import { isRedirect } from '../transform';
import { findBreakpoint } from './findBreakpoint';
import { HELD_ACTION_APPLIERS } from './heldActionAppliers';
import { heldInputOf } from './heldInputOf';
import { isEventStream } from './isEventStream';
import type { MatcherCache } from './MatcherCache';
import type { HeldActionApplier, PausedRequestContext, RequestPausedParams } from './types';

/**
 * Holds a fetch() or XHR a breakpoint stops at this stage until the user decides, then does what they
 * chose. True once it is answered, or the page gave up on it; false to let it go on as it would have,
 * or when nothing stops it. A preflight, a redirect and an event stream never stop: a stream's body
 * can't be read while it is open.
 */
export async function stopAtBreakpoint(ctx: PausedRequestContext, matchers: MatcherCache, p: RequestPausedParams, stage: BreakpointStage, request: PausedRequest): Promise<boolean> {
  const { opts } = ctx;
  if (!opts.hold || isPreflight(request)) return false;
  if (stage === 'response' && (isRedirect(p.responseStatusCode, p.responseHeaders) || isEventStream(p))) return false;
  const breakpoint = findBreakpoint(opts.getBreakpoints?.() ?? [], p, stage, matchers);
  if (!breakpoint) return false;
  const action = await opts.hold(await heldInputOf(ctx, p, breakpoint, stage), ctx.owner);
  // Given up: the page cancelled it, or its session went, and nothing can answer it any more.
  if (!action) return true;
  const apply = HELD_ACTION_APPLIERS[stage][action.type] as HeldActionApplier<HeldAction>;
  return apply(ctx, p, action, request);
}
