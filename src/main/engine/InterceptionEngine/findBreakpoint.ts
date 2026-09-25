import { ANY_METHOD } from '../../../shared/overrides';
import type { Breakpoint, BreakpointStage } from '../../../shared/types';
import { FETCH_RESOURCE_TYPES } from './constants';
import type { MatcherCache } from './MatcherCache';
import type { RequestPausedParams } from './types';

/** The oldest enabled breakpoint that stops this fetch() or XHR at this stage (its URL and method), if any. */
export function findBreakpoint(breakpoints: readonly Breakpoint[], p: RequestPausedParams, stage: BreakpointStage, matchers: MatcherCache): Breakpoint | undefined {
  if (!FETCH_RESOURCE_TYPES.has(p.resourceType)) return undefined;
  const method = p.request.method.toUpperCase();
  return breakpoints.find((b) => b.enabled && b.stage === stage && (b.method === ANY_METHOD || b.method === method) && matchers.predicate(b.match)(p.request.url));
}
