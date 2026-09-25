import type { GroupChoice } from '@/features/network/filter';

/** A row's height: rows are one line, so the list never measures them. */
export const ROW_HEIGHT = 22;

/** Rows rendered beyond each edge of the visible window. */
export const OVERSCAN_ROWS = 16;

/** How close to the end counts as "at the bottom", in px: new rows then keep the list scrolled to the end. */
export const STICK_TO_BOTTOM_PX = 24;

/** Each group's chip, in the order they show (All first). */
export const GROUP_LABELS: Record<GroupChoice, string> = {
  all: 'All',
  fetch: 'Fetch/XHR',
  doc: 'Doc',
  js: 'JS',
  css: 'CSS',
  img: 'Img',
  media: 'Media',
  font: 'Font',
  other: 'Other',
};

/** A status's tint by its class (2xx, 3xx…); anything else reads muted. */
export const STATUS_CLASS_TONE: Readonly<Record<number, string>> = {
  2: 'text-fg-muted',
  3: 'text-info',
  4: 'text-danger',
  5: 'text-danger',
};

/** Sizes as a row shows them, from bytes up. */
export const SIZE_UNITS = ['B', 'kB', 'MB', 'GB'] as const;

/** Bytes in a kB (as DevTools counts them). */
export const KILO = 1024;

/** ms in a second: a longer request's time shows in seconds. */
export const SECOND_MS = 1000;
