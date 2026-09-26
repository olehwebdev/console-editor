import type { FrameStack } from '@common/types';
import { TREE_LIBRARIES } from './constants';

/** The frames whose Components tree can be shown: those the page stack found React, Vue, Angular or Lit in, the top page first. */
export function treeFrames(stacks: readonly FrameStack[]): string[] {
  return stacks.filter((stack) => stack.hits.some((hit) => TREE_LIBRARIES.has(hit.id))).map((stack) => stack.frameId);
}
