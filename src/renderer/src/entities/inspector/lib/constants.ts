import type { InspectFramework, RenderReasonKind } from '@common/types';

/**
 * Whether a component's name is its function's or class's (React, Angular), so the original's name beats a
 * minified one; Vue's is its `name` option (its function is `setup` or `render`), a web component's its tag.
 */
export const NAMED_BY_FUNCTION: Record<InspectFramework, boolean> = { react: true, vue: false, vue2: false, angular: true, element: false };

/** A React hook is named by its place among the component's hooks (1-based). */
export const HOOK_PLACE = /^\d+$/;

/** What each reason a component rendered for is called (a reason with changes lists them after). */
export const REASON_LABEL: Record<RenderReasonKind, string> = {
  props: 'props',
  state: 'state',
  store: 'store',
  context: 'context',
  parent: 'its parent rendered',
  update: 'its own update, with nothing changed',
};
