import { PAGE_DIRTY_CHECKS } from './pageDirtyChecks';
import type { PageKind, PageTabOf } from './types';

/** Whether closing the page would lose edits. Generic so each kind reaches its own check without a cast. */
export function isPageDirty<K extends PageKind>(page: PageTabOf<K>): boolean {
  return PAGE_DIRTY_CHECKS[page.page](page);
}
