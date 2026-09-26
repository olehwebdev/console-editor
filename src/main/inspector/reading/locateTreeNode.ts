import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { ELEMENT_OF_SOURCE } from '../adapter/adapterSource';
import { ADAPTER_MODE } from '../constants';
import { runAdapter } from './runAdapter';

const DEPTH_OF_SOURCE = 'function () { return this.depth; }';

/** A tree node's first element, as a handle in `objectGroup`, and where its component is in that element's chain; null if it has none. */
export async function locateTreeNode(transport: CdpTransport, uniqueContextId: string, path: number[], objectGroup: string): Promise<{ objectId: string; depth: number } | null> {
  const answer = await runAdapter(transport, uniqueContextId, ADAPTER_MODE.locate, path, objectGroup);
  const answerId = !answer.exceptionDetails && answer.result.objectId;
  if (!answerId) return null;
  const call = (functionDeclaration: string, returnByValue: boolean) =>
    transport.send<EvaluateReply>(CDP.Runtime.callFunctionOn, { objectId: answerId, functionDeclaration, objectGroup, returnByValue, silent: true });
  const [element, depth] = await Promise.all([call(ELEMENT_OF_SOURCE, false), call(DEPTH_OF_SOURCE, true)]);
  const at = depth.result.value;
  return element.result.objectId && typeof at === 'number' && Number.isInteger(at) && at >= 0 ? { objectId: element.result.objectId, depth: at } : null;
}
