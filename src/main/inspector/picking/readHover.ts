import type { InspectHover } from '../../../shared/types';
import type { EvaluateReply, RemoteObject } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { ADAPTER_SOURCE } from '../adapter/adapterSource';
import { ADAPTER_MODE, HOVER_GROUP } from '../constants';
import { toInspectHover } from '../reading/toInspectHover';

/** What is under the pointer: the element, its framework and the components that rendered it. Null if it can't be read. */
export async function readHover(transport: CdpTransport, nodeId: number): Promise<InspectHover | null> {
  try {
    const { object } = await transport.send<{ object: RemoteObject }>(CDP.DOM.resolveNode, { nodeId, objectGroup: HOVER_GROUP });
    const reply = await transport.send<EvaluateReply>(CDP.Runtime.callFunctionOn, {
      objectId: object.objectId,
      functionDeclaration: ADAPTER_SOURCE,
      arguments: [{ value: ADAPTER_MODE.summary }, { value: 0 }],
      returnByValue: true,
      silent: true,
    });
    return reply.exceptionDetails ? null : toInspectHover(reply.result.value);
  } catch {
    return null;
  } finally {
    transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup: HOVER_GROUP }).catch(() => undefined);
  }
}
