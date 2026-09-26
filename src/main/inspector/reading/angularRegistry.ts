import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { FIND_REGISTRY_SOURCE, KEEP_REGISTRY_SOURCE, KEPT_REGISTRY_SOURCE, MAP_PROTOTYPE_SOURCE } from '../adapter/registrySource';

/**
 * Angular's view registry, when the page of an element (or document) runs a production Angular build: a handle
 * in `objectGroup`. Found once per document among every Map of the heap (`Runtime.queryObjects`, a walk of the
 * heap), then kept on its window, where each later read takes it with one call. Null when the page doesn't
 * need it, or it can't be found.
 */
export async function angularRegistry(transport: CdpTransport, objectId: string, objectGroup: string): Promise<string | null> {
  const call = (id: string, functionDeclaration: string, returnByValue = false) => transport.send<EvaluateReply>(CDP.Runtime.callFunctionOn, { objectId: id, functionDeclaration, objectGroup, returnByValue, silent: true });
  try {
    const kept = await call(objectId, KEPT_REGISTRY_SOURCE);
    if (kept.result.objectId) return kept.result.objectId;
    // Undefined: the page needs none; null: it needs one not found yet.
    if (kept.result.subtype !== 'null') return null;
    const prototype = await call(objectId, MAP_PROTOTYPE_SOURCE);
    const { objects } = await transport.send<{ objects: { objectId?: string } }>(CDP.Runtime.queryObjects, { prototypeObjectId: prototype.result.objectId, objectGroup });
    const registry = objects.objectId ? await call(objects.objectId, FIND_REGISTRY_SOURCE) : null;
    const found = registry?.result.objectId ?? null;
    if (found) await call(found, KEEP_REGISTRY_SOURCE, true);
    return found;
  } catch {
    return null;
  }
}
