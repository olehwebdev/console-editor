import type { EvaluateReply, PageFrameTree } from '../../console/types';
import { subframesOf } from '../../console/ConsoleFrames/subframesOf';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { OWNER_DOCUMENT_SOURCE } from '../adapter/adapterSource';

/** What `DOM.describeNode` says of a node that we use. */
interface DescribedNode {
  node: { backendNodeId: number; contentDocument?: { backendNodeId: number } };
}

/**
 * The frame a node of this session is in. CDP doesn't say: the node's document is
 * matched against the content document of each frame's owner element (which the
 * DOM domain sees across origins), else it is the session's own frame. Null if
 * that can't be told (the frame went away).
 */
export async function frameOfNode(transport: CdpTransport, objectId: string, objectGroup: string): Promise<string | null> {
  try {
    const { result: doc } = await transport.send<EvaluateReply>(CDP.Runtime.callFunctionOn, { objectId, functionDeclaration: OWNER_DOCUMENT_SOURCE, objectGroup, silent: true });
    const [{ node }, { frameTree }] = await Promise.all([
      transport.send<DescribedNode>(CDP.DOM.describeNode, { objectId: doc.objectId }),
      transport.send<{ frameTree: PageFrameTree }>(CDP.Page.getFrameTree),
    ]);
    for (const frame of subframesOf(frameTree)) {
      const owner = await transport.send<{ backendNodeId: number }>(CDP.DOM.getFrameOwner, { frameId: frame.id }).catch(() => null);
      if (!owner) continue;
      const described = await transport.send<DescribedNode>(CDP.DOM.describeNode, { backendNodeId: owner.backendNodeId });
      if (described.node.contentDocument?.backendNodeId === node.backendNodeId) return frame.id;
    }
    return frameTree.frame.id;
  } catch {
    return null;
  }
}
