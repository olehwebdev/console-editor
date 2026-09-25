import { ANY_METHOD, RESPONSE_KIND } from '@common/overrides';
import type { NetworkRequest, OverrideMeta } from '@common/types';
import { predicateFor } from '@/shared/lib';

/**
 * The response override that answers a request, as the engine picks it by URL, method and GraphQL
 * operation (enabled ones first, then any): the one to open instead of a new tab.
 */
export function findResponseOverride(request: Pick<NetworkRequest, 'url' | 'method' | 'operation'>, overrides: OverrideMeta[]): OverrideMeta | undefined {
  const matching = overrides.filter((o) => {
    if (o.kind !== RESPONSE_KIND || !predicateFor(o.match)(request.url)) return false;
    const { method, operation } = o.request ?? { method: ANY_METHOD, operation: '' };
    return (method === ANY_METHOD || method === request.method) && (!operation || operation === request.operation);
  });
  return matching.find((o) => o.enabled) ?? matching[0];
}
