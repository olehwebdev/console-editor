import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { ADAPTER_SOURCE } from '../adapter/adapterSource';
import { ADAPTER_MODE, PICK_GONE } from '../constants';
import type { toStateEdit } from './toStateEdit';

/** Runs the adapter's `set` on an element for the component at `depth` of its chain; true once the value is set and rendered. */
export async function writeState(transport: CdpTransport, objectId: string, depth: number, edit: ReturnType<typeof toStateEdit>): Promise<boolean> {
  const reply = await transport
    .send<EvaluateReply>(CDP.Runtime.callFunctionOn, {
      objectId,
      functionDeclaration: ADAPTER_SOURCE,
      arguments: [{ value: ADAPTER_MODE.set }, { value: depth }, { value: edit }],
      awaitPromise: true,
      returnByValue: true,
      silent: true,
    })
    .catch(() => {
      throw new Error(PICK_GONE);
    });
  return !reply.exceptionDetails && reply.result.value === true;
}
