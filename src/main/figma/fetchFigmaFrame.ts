import type { FigmaFrame } from '../../shared/types';
import { EXPORT, FIGMA_TIMEOUT_MS, NAME_UNSAFE } from './constants';
import { figmaJson } from './figmaJson';
import type { ImagesAnswer, NodesAnswer } from './types';

/**
 * A frame of a Figma file, exported as PNG at the design's scale: its name (the frame's, `@2x`), then Figma's render,
 * downloaded from where Figma put it (without the token).
 */
export async function fetchFigmaFrame({ fileKey, nodeId }: FigmaFrame, token: string, api: string): Promise<{ name: string; bytes: Uint8Array }> {
  const ids = encodeURIComponent(nodeId);
  const nodes = await figmaJson<NodesAnswer>(`${api}/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${ids}&depth=1`, token);
  const frame = nodes.nodes?.[nodeId]?.document;
  if (!frame) throw new Error("That frame isn't in the file (any more)");
  const images = await figmaJson<ImagesAnswer>(`${api}/v1/images/${encodeURIComponent(fileKey)}?ids=${ids}&format=${EXPORT.format}&scale=${EXPORT.scale}`, token);
  const url = images.images?.[nodeId];
  if (!url) throw new Error(images.err ? `Figma: ${images.err}` : "Figma couldn't render that frame");
  const response = await fetch(url, { signal: AbortSignal.timeout(FIGMA_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Could not download the frame from Figma (${response.status})`);
  const name = (typeof frame.name === 'string' ? frame.name.replace(NAME_UNSAFE, ' ').trim() : '') || nodeId;
  return { name: `${name}${EXPORT.suffix}`, bytes: new Uint8Array(await response.arrayBuffer()) };
}
