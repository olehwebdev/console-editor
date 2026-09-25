import type { InspectedComponent } from '../../../shared/types';
import type { SessionKey } from '../../console/ConsoleFrames';
import type { RemoteObject } from '../../console/types';
import { CDP } from '../../engine/constants';
import { HIGHLIGHT_CONFIG, MAX_PICKS, NOT_SETTABLE, PICK_GONE, PICK_GROUP_PREFIX, READ_GROUP_PREFIX } from '../constants';
import type { InspectedSessions, Pick } from '../types';
import { frameOfNode } from './frameOfNode';
import { inspectNode } from './inspectNode';
import { readComponent } from './readComponent';
import { toInspectedComponent } from './toInspectedComponent';
import { toStateEdit } from './toStateEdit';
import { writeState } from './writeState';

/**
 * The elements picked, kept by handle (the last `MAX_PICKS`, each in an object
 * group of its own), and what the components that rendered them hold: read again
 * each time, so a page tab shows the component as it is now.
 */
export class ComponentReader {
  private readonly picks = new Map<string, Pick>();
  private count = 0;

  constructor(private readonly sessions: InspectedSessions) {}

  /** A new pick's id and object group, for a handle made before it is kept (`pickObject`). */
  newPick(): { id: string; group: string } {
    const id = String(++this.count);
    return { id, group: `${PICK_GROUP_PREFIX}${id}` };
  }

  /** Keeps a picked node, makes it the console's `$0`, and describes the component that rendered it. */
  async pick(sessionId: SessionKey, backendNodeId: number): Promise<InspectedComponent> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(PICK_GONE);
    const { id, group } = this.newPick();
    const { object } = await session.transport.send<{ object: RemoteObject }>(CDP.DOM.resolveNode, { backendNodeId, objectGroup: group });
    if (!object.objectId) throw new Error(PICK_GONE);
    const frameId = await frameOfNode(session.transport, object.objectId, group);
    return this.adopt({ id, sessionId, backendNodeId, objectId: object.objectId, group, frameId }, 0);
  }

  /** Picks an element the page handed over (a tree node's first one) in a `newPick` group, and describes the component at `depth` of its chain. */
  async pickObject(sessionId: SessionKey, pick: { id: string; group: string }, objectId: string, frameId: string, depth: number): Promise<InspectedComponent> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(PICK_GONE);
    const { node } = await session.transport.send<{ node: { backendNodeId: number } }>(CDP.DOM.describeNode, { objectId });
    return this.adopt({ ...pick, sessionId, backendNodeId: node.backendNodeId, objectId, frameId }, depth);
  }

  /** The component at `depth` of a pick's chain (0: the one that rendered the element). */
  async describe(pickId: unknown, depth: unknown): Promise<InspectedComponent> {
    const { pick, session, at } = this.find(pickId, depth);
    const read = await readComponent(session.transport, pick.objectId, at, session.scripts, `${READ_GROUP_PREFIX}${++this.count}`);
    if (!read) throw new Error(PICK_GONE);
    return toInspectedComponent(read.data, read.locations, { pickId: pick.id, frameId: pick.frameId });
  }

  /** Sets a state value of the component at `depth` of a pick's chain, then describes it again. */
  async setState(pickId: unknown, depth: unknown, raw: unknown): Promise<InspectedComponent> {
    const edit = toStateEdit(raw);
    const { pick, session, at } = this.find(pickId, depth);
    if (!(await writeState(session.transport, pick.objectId, at, edit))) throw new Error(NOT_SETTABLE);
    return this.describe(pick.id, at);
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

  private async adopt(pick: Pick, depth: number): Promise<InspectedComponent> {
    this.keep(pick);
    await inspectNode(this.sessions.get(pick.sessionId)!.transport, pick.backendNodeId).catch(() => undefined);
    return this.describe(pick.id, depth);
  }

  /** A kept pick, its session and a depth of its chain, as the renderer names them. */
  private find(pickId: unknown, depth: unknown) {
    const pick = typeof pickId === 'string' ? this.picks.get(pickId) : undefined;
    const session = pick && this.sessions.get(pick.sessionId);
    if (!pick || !session) throw new Error(PICK_GONE);
    return { pick, session, at: typeof depth === 'number' && Number.isInteger(depth) && depth >= 0 ? depth : 0 };
  }

  private keep(pick: Pick): void {
    this.picks.set(pick.id, pick);
    for (const old of [...this.picks.values()].slice(0, Math.max(0, this.picks.size - MAX_PICKS))) {
      this.picks.delete(old.id);
      this.sessions.get(old.sessionId)?.transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup: old.group }).catch(() => undefined);
    }
  }
}
