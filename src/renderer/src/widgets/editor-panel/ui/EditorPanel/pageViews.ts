import { ComparePage } from '../ComparePage';
import { ComponentPage } from '../ComponentPage';
import { NewRulePage, RulePage } from '../RulePage';
import { ShotPage } from '../ShotPage';
import { StackPage } from '../StackPage';
import type { PageViews } from './types';
import { WhatsNewPageView } from './WhatsNewPageView';

/** What each page kind shows. Annotated rather than `satisfies`: `PageView`'s generic lookup needs the mapped type. */
export const PAGE_VIEWS: PageViews = {
  'whats-new': WhatsNewPageView,
  stack: StackPage,
  component: ComponentPage,
  rule: RulePage,
  'new-rule': NewRulePage,
  shot: ShotPage,
  compare: ComparePage,
};
