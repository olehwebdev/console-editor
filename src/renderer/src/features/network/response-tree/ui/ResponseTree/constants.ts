import type { JsonKind } from '@common/json';

/** How an object or array reads, closed or open: its size in its brackets. */
export const CONTAINER_LABELS: Partial<Record<JsonKind, (count: number) => string>> = {
  object: (count) => `{${count}}`,
  array: (count) => `[${count}]`,
};

/** The longest value text a row shows (the rest is in the text view). */
export const MAX_SHOWN_CHARS = 300;

/** The tree an edit field is in: focus goes back to it once the field has written or dropped its edit. */
export const TREE_SELECTOR = '[role="tree"]';
