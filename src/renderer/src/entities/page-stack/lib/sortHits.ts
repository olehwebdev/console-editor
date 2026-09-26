import { STACK_CATEGORIES, STACK_LIBRARIES } from '@common/stackLibraries';
import type { StackHit } from '@common/types';

/** A frame's findings in the order the Page stack lists them: UI library, framework, state, bundler. */
export function sortHits(hits: readonly StackHit[]): StackHit[] {
  const rank = (hit: StackHit) => STACK_CATEGORIES.indexOf(STACK_LIBRARIES[hit.id].category);
  return [...hits].sort((a, b) => rank(a) - rank(b));
}
