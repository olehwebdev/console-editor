import type { RuleAction } from '@common/types';

/** An override has two items: their ids are one of these prefixes and its id. */
export const OVERRIDE_ITEM_PREFIX = { open: 'open-', toggle: 'toggle-' } as const;

/** A rule has two items: their ids are one of these prefixes and its id (never an override item's id). */
export const RULE_ITEM_PREFIX = { open: 'rule-open-', toggle: 'rule-toggle-' } as const;

/** A workspace's item id: this prefix and its id. */
export const WORKSPACE_ITEM_PREFIX = 'workspace-';

/** The "new rule" actions' ids: this prefix and the action. */
export const NEW_RULE_ITEM_PREFIX = 'new-rule-';

/** What else finds each "new rule" action. */
export const NEW_RULE_KEYWORDS: Record<RuleAction, string[]> = {
  block: ['block', 'analytics', 'ads', 'rule'],
  headers: ['headers', 'csp', 'cache', 'rule'],
  cors: ['cors', 'cross-origin', 'rule'],
};
