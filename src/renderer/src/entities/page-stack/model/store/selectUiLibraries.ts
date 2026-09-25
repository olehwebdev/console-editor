import { STACK_LIBRARIES } from '@common/stackLibraries';
import type { PageStackStore } from './types';

/** The UI libraries the page runs, each named once, the top page's first: a new array, so select it with `useShallow`. */
export const selectUiLibraries = (s: PageStackStore): string[] => {
  const names = s.stacks.flatMap((stack) => stack.hits.map((hit) => STACK_LIBRARIES[hit.id])).filter((library) => library.category === 'ui').map((library) => library.name);
  return [...new Set(names)];
};
