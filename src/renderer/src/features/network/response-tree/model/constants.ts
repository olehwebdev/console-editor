import type { JsonKind } from '@common/json';

/** How each kind of value reads in the tree, as the editor colours JSON. */
export const VALUE_TONES: Record<JsonKind, string> = {
  string: 'text-live',
  number: 'text-accent',
  boolean: 'text-warning',
  null: 'text-fg-subtle',
  object: 'text-fg-subtle',
  array: 'text-fg-subtle',
};

/** A row's height: one line each, so the list never measures them. */
export const TREE_ROW_HEIGHT = 24;

/** Rows rendered beyond each edge of the visible window. */
export const TREE_OVERSCAN = 20;

/** How far each level is indented, in px. */
export const TREE_INDENT = 14;

/** Where an id's last segment starts: an id is its parent's plus `/segment`. */
export const ID_SEPARATOR = '/';
