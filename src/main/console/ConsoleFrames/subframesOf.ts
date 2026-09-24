import type { PageFrame, PageFrameTree } from '../types';

/** Every frame nested in a frame tree, each before the frames nested in it. */
export function subframesOf(tree: PageFrameTree): PageFrame[] {
  return (tree.childFrames ?? []).flatMap((child) => [child.frame, ...subframesOf(child)]);
}
