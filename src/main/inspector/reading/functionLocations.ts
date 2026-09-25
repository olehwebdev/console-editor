import type { CodeLocation } from '../../../shared/types';
import type { GetPropertiesReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { FUNCTION_LOCATION, MAX_PLACED_FUNCTIONS } from '../constants';
import type { ScriptUrls } from './ScriptUrls';

/** V8's place of a function: its script, and 0-based line and column. */
interface FunctionPlace {
  scriptId: string;
  lineNumber: number;
  columnNumber: number;
}

/**
 * Where each function of an array in the page is defined, by index: null for one
 * V8 doesn't place (native, bound), whose script has no URL (evaluated code), that
 * is past `MAX_PLACED_FUNCTIONS`, or that went away meanwhile (the others are kept).
 */
export async function functionLocations(transport: CdpTransport, arrayId: string, scripts: ScriptUrls): Promise<Array<CodeLocation | null>> {
  const { result } = await transport.send<GetPropertiesReply>(CDP.Runtime.getProperties, { objectId: arrayId, ownProperties: true });
  const items = result.filter((p) => /^\d+$/.test(p.name));
  const locations: Array<CodeLocation | null> = new Array(items.length).fill(null);
  await Promise.all(
    items.slice(0, MAX_PLACED_FUNCTIONS).map(async (item) => {
      if (!item.value?.objectId) return;
      const reply = await transport.send<GetPropertiesReply>(CDP.Runtime.getProperties, { objectId: item.value.objectId, ownProperties: true }).catch(() => null);
      const place = reply?.internalProperties?.find((p) => p.name === FUNCTION_LOCATION)?.value?.value as FunctionPlace | undefined;
      const url = place && (await scripts.url(place.scriptId).catch(() => null));
      if (place && url) locations[Number(item.name)] = { url, line: place.lineNumber, column: place.columnNumber };
    }),
  );
  return locations;
}
