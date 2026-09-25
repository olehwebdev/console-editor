import type { PageKind, PageTabOf } from './types';

/** Whether a page holds edits that closing it would lose, by kind: a new kind fails typecheck until it has one. */
export const PAGE_DIRTY_CHECKS: { [K in PageKind]: (page: PageTabOf<K>) => boolean } = {
  'whats-new': () => false,
  rule: (page) => !!page.draft,
  'new-rule': (page) => !!page.draft,
};
