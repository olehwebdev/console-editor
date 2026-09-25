import type { UrlMatcher } from '@common/types';

/** A saved rule's page id: this prefix and the rule's id (one page per rule). */
export const RULE_PAGE_PREFIX = 'page:rule:';

/** A new rule's page id: this prefix and a random id (any number of them). */
export const NEW_RULE_PAGE_PREFIX = 'page:new-rule:';

/** Keys of the header rows a page starts with: this prefix and the row's index. */
export const SAVED_ROW_KEY_PREFIX = 'saved-';

/** Keys of header rows added since: this prefix and a counter. Such a row's name field takes focus as it appears. */
export const NEW_ROW_KEY_PREFIX = 'row-';

/** A rule written from scratch starts with an empty glob: most rules name a host or a folder. */
export const EMPTY_SEED_MATCHER: Readonly<UrlMatcher> = { type: 'glob', pattern: '', ignoreQuery: true };
