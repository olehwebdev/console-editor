import type { NetworkRequest } from '@common/types';
import type { BreakpointInput } from './constants';

/** A breakpoint for requests like this one: its URL (any query) and method, stopped at the response. */
export function breakpointLike(request: Pick<NetworkRequest, 'url' | 'method'>): BreakpointInput {
  const url = new URL(request.url);
  return { match: { type: 'exact', pattern: `${url.origin}${url.pathname}`, ignoreQuery: true }, method: request.method, stage: 'response' };
}
