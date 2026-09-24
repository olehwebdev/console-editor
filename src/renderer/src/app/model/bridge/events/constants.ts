import { TOAST_DURATION } from '@/shared/config';

/** One "override missed" toast per override: a repeat replaces it in place (and restarts its timer). */
export const OVERRIDE_MISSED_TOAST_ID_PREFIX = 'missed:';

/** Twice the default: it explains a cause and offers a reload. */
export const OVERRIDE_MISSED_TOAST_MS = TOAST_DURATION.actionable;
