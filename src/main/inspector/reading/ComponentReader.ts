import type { InspectedComponent } from '../../../shared/types';
import type { SessionKey } from '../../console/ConsoleFrames';
import type { RemoteObject } from '../../console/types';
import { CDP } from '../../engine/constants';
import { HIGHLIGHT_CONFIG, MAX_PICKS, PICK_GONE, PICK_GROUP_PREFIX, READ_GROUP_PREFIX } from '../constants';
import type { InspectedSessions, Pick } from '../types';
import { frameOfNode } from './frameOfNode';
import { inspectNode } from './inspectNode';
import { readComponent } from './readComponent';
import { toInspectedComponent } from './toInspectedComponent';

/**
 * The elements picked, kept by handle (the last `MAX_PICKS`, each in an object
 * group of its own), and what the components that rendered them hold: read again
 * each time, so a page tab shows the component as it is now.
 */
export class ComponentReader {
  private readonly picks = new Map<string, Pick>();
  private count = 0;

  constructor(private readonly sessions: InspectedSessions) {}

  /** Keeps a picked node, makes it the console's `$0`, and describes the component that rendered it. */
  async pick(sessionId: SessionKey, backendNodeId: number): Promise<InspectedComponent> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(PICK_GONE);
    const id = String(++this.count);
    const group = `${PICK_GROUP_PREFIX}${id}`;
    const { object } = await session.transport.send<{ object: RemoteObject }>(CDP.DOM.resolveNode, { backendNodeId, objectGroup: group });
    if (!object.objectId) throw new Error(PICK_GONE);
    const frameId = await frameOfNode(session.transport, object.objectId, group);
    this.keep({ id, sessionId, backendNodeId, objectId: object.objectId, group, frameId });
    await inspectNode(session.transport, backendNodeId).catch(() => undefined);
    return this.describe(id, 0);
  }

  /** The component at `depth` of a pick's chain (0: the one that rendered the element). */
  async describe(pickId: unknown, depth: unknown): Promise<InspectedComponent> {
    const pick = typeof pickId === 'string' ? this.picks.get(pickId) : undefined;
    const session = pick && this.sessions.get(pick.sessionId);
    if (!pick || !session) throw new Error(PICK_GONE);
    const at = typeof depth === 'number' && Number.isInteger(depth) && depth >= 0 ? depth : 0;
    const read = await readComponent(session.transport, pick.objectId, at, session.scripts, `${READ_GROUP_PREFIX}${++this.count}`);
    if (!read) throw new Error(PICK_GONE);
    return toInspectedComponent(read.data, read.locations, { pickId: pick.id, frameId: pick.frameId });
  }

  /** Highlights a pick's element in the page; null hides every highlight. */
  async highlight(pickId: unknown): Promise<void> {
    const pick = typeof pickId === 'string' ? this.picks.get(pickId) : undefined;
    const session = pick && this.sessions.get(pick.sessionId);
    if (pick && session) {
      await session.transport.send(CDP.Overlay.highlightNode, { backendNodeId: pick.backendNodeId, highlightConfig: HIGHLIGHT_CONFIG }).catch(() => undefined);
      return;
    }
    await Promise.all(this.sessions.all().map(([, s]) => s.transport.send(CDP.Overlay.hideHighlight).catch(() => undefined)));
  }

  /** A session went away: its picks' handles went with it. */
  dropSession(sessionId: SessionKey): void {
    for (const pick of [...this.picks.values()]) {
      if (pick.sessionId === sessionId) this.picks.delete(pick.id);
    }
  }

  private keep(pick: Pick): void {
    this.picks.set(pick.id, pick);
    for (const old of [...this.picks.values()].slice(0, Math.max(0, this.picks.size - MAX_PICKS))) {
      this.picks.delete(old.id);
      this.sessions.get(old.sessionId)?.transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup: old.group }).catch(() => undefined);
    }
  }
}
