import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';

/** Makes a node the console's `$0` (code run with the command-line API, as the console runs it). */
export async function inspectNode(transport: CdpTransport, backendNodeId: number): Promise<void> {
  const { nodeIds } = await transport.send<{ nodeIds: number[] }>(CDP.DOM.pushNodesByBackendIdsToFrontend, { backendNodeIds: [backendNodeId] });
  if (nodeIds[0]) await transport.send(CDP.DOM.setInspectedNode, { nodeId: nodeIds[0] });
}
