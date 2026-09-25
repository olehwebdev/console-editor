import type { ConsoleLevel, ConsoleSource, ConsoleValueKind } from '@common/types';

/** A single-line row's height: the virtualizer's first guess before it measures. */
export const ROW_ESTIMATE = 22;

/** Rows rendered beyond each edge of the visible window. */
export const OVERSCAN_ROWS = 12;

/** How close to the end counts as "at the bottom", in px: new rows then keep the list scrolled to the end. */
export const STICK_TO_BOTTOM_PX = 24;

/** A row's wash and text, by level. */
export const LEVEL_ROW: Record<ConsoleLevel, string> = {
  verbose: 'text-fg-muted',
  info: 'text-fg',
  warning: 'bg-warning/8 text-warning',
  error: 'bg-danger/8 text-danger',
};

export const LEVEL_LABEL: Record<ConsoleLevel, string> = {
  verbose: 'Verbose',
  info: 'Info',
  warning: 'Warnings',
  error: 'Errors',
};

/** How each kind of logged value reads (on a normal row; warnings and errors tint the whole row). */
export const VALUE_TONE: Record<ConsoleValueKind, string> = {
  string: '',
  number: 'text-info',
  boolean: 'text-info',
  nullish: 'text-fg-subtle',
  symbol: 'text-fg-muted',
  function: 'italic text-fg-muted',
  object: '',
  error: 'text-danger',
};

/** The mark before code you ran and what it gave back, as in DevTools. */
export const SOURCE_MARK: Partial<Record<ConsoleSource, string>> = { input: '›', result: '‹' };
