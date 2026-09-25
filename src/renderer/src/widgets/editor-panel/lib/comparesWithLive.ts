import { GET_METHOD, RESPONSE_KIND } from '@common/overrides';
import type { OverrideMeta } from '@common/types';

/**
 * Whether an override can be compared with what the server sends now: fetching that again is a GET,
 * which a response override that answers another method (or any) would never have been sent.
 */
export function comparesWithLive(override: OverrideMeta): boolean {
  return override.kind !== RESPONSE_KIND || override.request?.method === GET_METHOD;
}
