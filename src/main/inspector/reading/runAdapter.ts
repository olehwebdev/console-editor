import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { ADAPTER_SOURCE } from '../adapter/adapterSource';
import type { ADAPTER_MODE } from '../constants';
import { angularRegistry } from './angularRegistry';

/**
 * Runs one of the adapter's tree modes on a frame's document, in its main world, silently, with Angular's
 * registry when its page needs it; the answer stays in `objectGroup`.
 */
export async function runAdapter(
  transport: CdpTransport,
  uniqueContextId: string,
  mode: (typeof ADAPTER_MODE)['tree' | 'locate'],
  path: number[],
  objectGroup: string,
): Promise<EvaluateReply> {
  const doc = await transport.send<EvaluateReply>(CDP.Runtime.evaluate, { expression: 'document', uniqueContextId, objectGroup, silent: true });
  const documentId = doc.result.objectId;
  if (!documentId) return doc;
  const registry = await angularRegistry(transport, documentId, objectGroup);
  return transport.send<EvaluateReply>(CDP.Runtime.callFunctionOn, {
    objectId: documentId,
    functionDeclaration: ADAPTER_SOURCE,
    arguments: [{ value: mode }, { value: path }, { value: null }, registry ? { objectId: registry } : { value: null }],
    objectGroup,
    silent: true,
  });
}
