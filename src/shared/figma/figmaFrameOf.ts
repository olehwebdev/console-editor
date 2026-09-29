import type { FigmaFrame } from '../types';
import { BRANCH_SEGMENT, FIGMA_FILE_KINDS, FIGMA_HOSTS, NODE_ID_PARAM, NODE_ID_SEPARATOR } from './constants';

/**
 * The frame a Figma link names (Share › Copy link with a frame selected, or the address bar's): its file (a branch's
 * own, for a branch) and node. Null for anything else, a link to a whole file or page included.
 */
export function figmaFrameOf(link: string): FigmaFrame | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  const [kind, key, branch, branchKey] = url.pathname.split('/').filter(Boolean);
  const node = url.searchParams.get(NODE_ID_PARAM)?.replaceAll(NODE_ID_SEPARATOR.link, NODE_ID_SEPARATOR.api);
  if (!FIGMA_HOSTS.has(url.hostname) || !FIGMA_FILE_KINDS.has(kind ?? '') || !key || !node) return null;
  return { fileKey: branch === BRANCH_SEGMENT && branchKey ? branchKey : key, nodeId: node };
}
