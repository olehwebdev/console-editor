/** Time units for "15 h ago", largest first: how many milliseconds each is, and how one and several are written. */
export const TIME_UNITS = [
  { ms: 24 * 60 * 60 * 1000, one: 'day', many: 'days' },
  { ms: 60 * 60 * 1000, one: 'h', many: 'h' },
  { ms: 60 * 1000, one: 'min', many: 'min' },
] as const;

/** Under a minute old. */
export const JUST_NOW = 'just now';

/** Each shot kind's word in its detail line. */
export const KIND_LABEL = { capture: 'Capture', design: 'Design' } as const;
