import type { CodeLocation } from '../../../shared/types';
import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { DATA_OF_SOURCE, FNS_OF_SOURCE } from '../adapter/adapterSource';
import { functionLocations } from './functionLocations';
import type { ScriptUrls } from './ScriptUrls';

/** Reads an adapter's `{ data, fns }` answer: its data by value (unchecked), and where each function it names is defined. */
export async function readAnswer(
  transport: CdpTransport,
  answerId: string,
  scripts: ScriptUrls,
  objectGroup: string,
): Promise<{ data: unknown; locations: Array<CodeLocation | null> }> {
  const call = (functionDeclaration: string, returnByValue: boolean) =>
    transport.send<EvaluateReply>(CDP.Runtime.callFunctionOn, { objectId: answerId, functionDeclaration, objectGroup, returnByValue, silent: true });
  const [data, fns] = await Promise.all([call(DATA_OF_SOURCE, true), call(FNS_OF_SOURCE, false)]);
  const locations = fns.result.objectId ? await functionLocations(transport, fns.result.objectId, scripts) : [];
  return { data: data.result.value, locations };
}
