import type { CodeLocation } from '../../../shared/types';
import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { ADAPTER_SOURCE, DATA_OF_SOURCE, FNS_OF_SOURCE } from '../adapter/adapterSource';
import { ADAPTER_MODE } from '../constants';
import { functionLocations } from './functionLocations';
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
  const call = (id: string, functionDeclaration: string, extra: Record<string, unknown> = {}) =>
    transport.send<EvaluateReply>(CDP.Runtime.callFunctionOn, { objectId: id, functionDeclaration, objectGroup, silent: true, ...extra });
  try {
    const holder = await call(objectId, ADAPTER_SOURCE, { arguments: [{ value: ADAPTER_MODE.describe }, { value: depth }] });
    if (holder.exceptionDetails || !holder.result.objectId) return null;
    const [data, fns] = await Promise.all([call(holder.result.objectId, DATA_OF_SOURCE, { returnByValue: true }), call(holder.result.objectId, FNS_OF_SOURCE)]);
    const locations = fns.result.objectId ? await functionLocations(transport, fns.result.objectId, scripts) : [];
    return { data: data.result.value, locations };
  } catch {
    // The element's document or frame went away.
    return null;
  } finally {
    transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup }).catch(() => undefined);
  }
}
