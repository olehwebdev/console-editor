import type { ComponentTreeLevel, InspectedComponent } from '../../../shared/types';
import { CDP } from '../../engine/constants';
import { ADAPTER_MODE, FRAME_GONE, NO_ELEMENT, TREE_GROUP_PREFIX } from '../constants';
import type { FrameTargets, InspectedSessions } from '../types';
import { showHighlight } from '../picking/showHighlight';
import type { ComponentReader } from './ComponentReader';
import { locateTreeNode } from './locateTreeNode';
import { readAnswer } from './readAnswer';
import { runAdapter } from './runAdapter';
import { toPath } from './toPath';
import { toTreeLevel } from './toTreeLevel';

/**
 * A frame's Components tree, a level at a time, read in its main world (where
 * the console's frames say, so it needs **Record the console**). A node opens as
 * a pick of its first element, and highlights as that element.
 */
export class TreeReader {
  private count = 0;

  constructor(
    private readonly sessions: InspectedSessions,
    private readonly frames: FrameTargets,
    private readonly reader: ComponentReader,
  ) {}

  /** The components under the node at `path`; null once that node is gone. */
  async level(frameId: unknown, path: unknown): Promise<ComponentTreeLevel | null> {
    const { transport, uniqueId, scripts, at } = this.find(frameId, path);
    const group = `${TREE_GROUP_PREFIX}${++this.count}`;
    try {
      const answer = await runAdapter(transport, uniqueId, ADAPTER_MODE.tree, at.path, group);
      if (answer.exceptionDetails || !answer.result.objectId) return null;
      const { data, locations } = await readAnswer(transport, answer.result.objectId, scripts, group);
      return toTreeLevel(data, locations, at);
    } finally {
      transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup: group }).catch(() => undefined);
    }
  }

  async open(frameId: unknown, path: unknown): Promise<InspectedComponent> {
    const { transport, uniqueId, sessionId, at } = this.find(frameId, path);
    const pick = this.reader.newPick();
    const located = await locateTreeNode(transport, uniqueId, at.path, pick.group);
    if (!located) {
      transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup: pick.group }).catch(() => undefined);
      throw new Error(NO_ELEMENT);
    }
    return this.reader.pickObject(sessionId, pick, located.objectId, at.frameId, located.depth);
  }

  /** Highlights a node's first element; null hides every highlight. */
  async highlight(frameId: unknown, path: unknown): Promise<void> {
    if (path === null) return this.reader.highlight(null);
    const { transport, uniqueId, at } = this.find(frameId, path);
    const group = `${TREE_GROUP_PREFIX}${++this.count}`;
    const located = await locateTreeNode(transport, uniqueId, at.path, group).catch(() => null);
    if (located) await showHighlight(transport, { objectId: located.objectId }).catch(() => undefined);
    transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup: group }).catch(() => undefined);
  }

  /** A frame's session and main world, and a path, as the renderer names them. */
  private find(frameId: unknown, path: unknown) {
    const target = typeof frameId === 'string' ? this.frames.target(frameId) : undefined;
    const session = target && this.sessions.get(target.sessionId);
    const checked = toPath(path);
    if (!target || !session || !checked) throw new Error(FRAME_GONE);
    return { ...session, uniqueId: target.uniqueId, sessionId: target.sessionId, at: { frameId: frameId as string, path: checked } };
  }
}
