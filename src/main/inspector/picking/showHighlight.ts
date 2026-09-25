import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { HIGHLIGHT_CONFIG } from '../constants';

/**
 * Highlights a node in a session's page. The Overlay domain (which needs the DOM domain) goes on for it: while
 * on it taxes every layout of the page, so it goes off again once highlights hide (`hideHighlights`).
 */
export async function showHighlight(transport: CdpTransport, node: { backendNodeId: number } | { objectId: string }): Promise<void> {
  await transport.send(CDP.DOM.enable);
  await transport.send(CDP.Overlay.enable);
  await transport.send(CDP.Overlay.highlightNode, { ...node, highlightConfig: HIGHLIGHT_CONFIG });
}
