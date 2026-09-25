import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { ADAPTER_SOURCE } from '../adapter/adapterSource';
import type { ADAPTER_MODE } from '../constants';

/** Runs one of the adapter's tree modes on a frame's document, in its main world, silently; the answer stays in `objectGroup`. */
export function runAdapter(
  transport: CdpTransport,
  uniqueContextId: string,
  mode: (typeof ADAPTER_MODE)['tree' | 'locate'],
  path: number[],
  objectGroup: string,
): Promise<EvaluateReply> {
  const expression = `(${ADAPTER_SOURCE}).call(document, ${JSON.stringify(mode)}, ${JSON.stringify(path)})`;
  return transport.send<EvaluateReply>(CDP.Runtime.evaluate, { expression, uniqueContextId, objectGroup, silent: true });
}
