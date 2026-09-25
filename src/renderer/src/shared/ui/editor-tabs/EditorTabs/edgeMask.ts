// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ScrollEdges } from './types';

/** Width (px) of the fade at an edge the strip can scroll past. */
const EDGE_FADE = 24;

/** The strip's mask: a fade at each edge it can scroll past; none when it can't scroll. */
export function edgeMask(edges: ScrollEdges): string | undefined {
  return edges.left || edges.right
    ? `linear-gradient(to right, ${edges.left ? `transparent, black ${EDGE_FADE}px` : 'black, black'}, ${edges.right ? `black calc(100% - ${EDGE_FADE}px), transparent` : 'black'})`
    : undefined;
}
