import type { CodeLocation } from '../../../shared/types';
import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { ADAPTER_SOURCE } from '../adapter/adapterSource';
import { ADAPTER_MODE } from '../constants';
import { readAnswer } from './readAnswer';
import type { ScriptUrls } from './ScriptUrls';

/**
 * Runs the adapter on an element for the component at `depth` of its chain: what
 * it said (unchecked), and where each function it named is defined. The handles
 * it made are released after, in `objectGroup`. Null if the element can't answer.
 */
export async function readComponent(
  transport: CdpTransport,
  objectId: string,
  depth: number,
  scripts: ScriptUrls,
  objectGroup: string,
): Promise<{ data: unknown; locations: Array<CodeLocation | null> } | null> {
  try {
    const answer = await transport.send<EvaluateReply>(CDP.Runtime.callFunctionOn, {
      objectId,
      functionDeclaration: ADAPTER_SOURCE,
      arguments: [{ value: ADAPTER_MODE.describe }, { value: depth }],
      objectGroup,
      silent: true,
    });
    if (answer.exceptionDetails || !answer.result.objectId) return null;
    return await readAnswer(transport, answer.result.objectId, scripts, objectGroup);
  } catch {
    // The element's document or frame went away.
    return null;
  } finally {
    transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup }).catch(() => undefined);
  }
}
