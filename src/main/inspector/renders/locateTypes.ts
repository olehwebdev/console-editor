import type { CodeLocation } from '../../../shared/types';
import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { RENDERED_TYPES } from '../constants';
import { functionLocations } from '../reading/functionLocations';
import type { ScriptUrls } from '../reading/ScriptUrls';

/** Where the component functions a document's commits name by id are defined, asked of its hook stand-in; by id. */
export async function locateTypes(transport: CdpTransport, contextId: number, ids: number[], scripts: ScriptUrls, objectGroup: string): Promise<Map<number, CodeLocation | null>> {
  const located = new Map<number, CodeLocation | null>(ids.map((id) => [id, null]));
  try {
    const expression = `window.__REACT_DEVTOOLS_GLOBAL_HOOK__.${RENDERED_TYPES}(${JSON.stringify(ids)})`;
    const reply = await transport.send<EvaluateReply>(CDP.Runtime.evaluate, { expression, contextId, objectGroup, silent: true });
    if (reply.exceptionDetails || !reply.result.objectId) return located;
    const locations = await functionLocations(transport, reply.result.objectId, scripts);
    ids.forEach((id, index) => located.set(id, locations[index] ?? null));
    return located;
  } catch {
    // The document went away meanwhile.
    return located;
  } finally {
    transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup }).catch(() => undefined);
  }
}
