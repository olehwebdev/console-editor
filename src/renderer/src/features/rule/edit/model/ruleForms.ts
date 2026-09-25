import type { RuleFormEntry } from './types';

/**
 * The forms of the open rule pages, by page id. A page's edits live in its form, outside React and
 * the stores (as a file tab's live in its Monaco model), so they survive another tab being in front
 * and Save (Ctrl/Cmd+S) reaches them. Mutated in place.
 */
export const ruleForms = new Map<string, RuleFormEntry>();
