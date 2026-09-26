import type { InspectedListener } from '../../../shared/types';
import type { EvaluateReply } from '../../console/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { LISTENERS_SOURCE } from '../adapter/listenersSource';
import { MAX_LIST_ITEMS } from '../constants';
import { cleanText } from './cleanText';
import { readAnswer } from './readAnswer';
import type { ScriptUrls } from './ScriptUrls';

/** What `DOMDebugger.getEventListeners` says of a listener that we use. */
interface DomListener {
  type: string;
  useCapture: boolean;
  passive: boolean;
  once: boolean;
  handler?: { objectId?: string };
}

/** The listeners on an element (a handle in a named group, or the DOM gives no handlers), each with its function's name and place. */
export async function readListeners(transport: CdpTransport, objectId: string, scripts: ScriptUrls, objectGroup: string): Promise<InspectedListener[]> {
  try {
    const { listeners } = await transport.send<{ listeners: DomListener[] }>(CDP.DOMDebugger.getEventListeners, { objectId });
    const shown = listeners.slice(0, MAX_LIST_ITEMS);
    const answer = await transport.send<EvaluateReply>(CDP.Runtime.callFunctionOn, {
      objectId,
      functionDeclaration: LISTENERS_SOURCE,
      arguments: shown.map((l) => (l.handler?.objectId ? { objectId: l.handler.objectId } : { value: null })),
      objectGroup,
      silent: true,
    });
    const { data, locations } = answer.result.objectId ? await readAnswer(transport, answer.result.objectId, scripts, objectGroup) : { data: [], locations: [] };
    const named = (Array.isArray(data) ? data : []) as Array<{ name?: unknown; fn?: unknown }>;
    return shown.map((l, i) => {
      const fn = named[i]?.fn;
      return { type: cleanText(l.type), name: cleanText(named[i]?.name), location: typeof fn === 'number' && fn >= 0 ? (locations[fn] ?? null) : null, capture: l.useCapture, once: l.once, passive: l.passive };
    });
  } catch {
    // The element's document went away.
    return [];
  } finally {
    transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup }).catch(() => undefined);
  }
}
