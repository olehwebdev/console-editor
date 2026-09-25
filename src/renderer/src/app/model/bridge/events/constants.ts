import { TOAST_DURATION } from '@/shared/config';

/** One "override missed" toast per override: a repeat replaces it in place (and restarts its timer). */
export const OVERRIDE_MISSED_TOAST_ID_PREFIX = 'missed:';

/** Twice the default: it explains a cause and offers a reload. */
export const OVERRIDE_MISSED_TOAST_MS = TOAST_DURATION.actionable;

/** One "rule missed" toast per rule and URL: a repeat replaces it in place. */
export const RULE_MISSED_TOAST_ID_PREFIX = 'rule-missed:';

/** Like the override's: it explains a cause and offers a reload. */
export const RULE_MISSED_TOAST_MS = TOAST_DURATION.actionable;
