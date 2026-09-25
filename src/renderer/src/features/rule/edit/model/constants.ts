import { zodResolver } from '@hookform/resolvers/zod';
import { ruleInputSchema } from '@common/rules';
import type { UrlMatcher } from '@common/types';

/** A saved rule's page id: this prefix and the rule's id (one page per rule). */
export const RULE_PAGE_PREFIX = 'page:rule:';

/** A new rule's page id: this prefix and a random id (any number of them). */
export const NEW_RULE_PAGE_PREFIX = 'page:new-rule:';

/** A rule written from scratch starts with an empty glob: most rules name a host or a folder. */
export const EMPTY_SEED_MATCHER: Readonly<UrlMatcher> = { type: 'glob', pattern: '', ignoreQuery: true };

/** How a rule page's form checks what is typed: as a rule is saved, on every change (its notes follow each keystroke too). */
export const RULE_FORM_OPTIONS = { resolver: zodResolver(ruleInputSchema), mode: 'onChange' } as const;
