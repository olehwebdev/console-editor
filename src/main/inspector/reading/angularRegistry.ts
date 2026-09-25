import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { FIND_REGISTRY_SOURCE, MAP_PROTOTYPE_SOURCE, NEEDS_REGISTRY_SOURCE } from '../adapter/registrySource';

/**
 * Angular's view registry, when the page of an element (or document) runs a production Angular build: a handle
 * in `objectGroup`, found among every Map of the heap (`Runtime.queryObjects`, a walk of the heap: only then).
 * Null when the page doesn't need it, or it can't be found.
 */
export async function angularRegistry(transport: CdpTransport, objectId: string, objectGroup: string): Promise<string | null> {
  const call = (id: string, functionDeclaration: string, returnByValue = false) => transport.send<EvaluateReply>(CDP.Runtime.callFunctionOn, { objectId: id, functionDeclaration, objectGroup, returnByValue, silent: true });
  try {
    const needs = await call(objectId, NEEDS_REGISTRY_SOURCE, true);
    if (needs.result.value !== true) return null;
    const prototype = await call(objectId, MAP_PROTOTYPE_SOURCE);
    const { objects } = await transport.send<{ objects: { objectId?: string } }>(CDP.Runtime.queryObjects, { prototypeObjectId: prototype.result.objectId, objectGroup });
    const registry = objects.objectId ? await call(objects.objectId, FIND_REGISTRY_SOURCE) : null;
    return registry?.result.objectId ?? null;
  } catch {
    return null;
  }
}
