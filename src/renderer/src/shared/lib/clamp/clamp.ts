/** `value` within [min, max]; `max` wins if the bounds cross, so a fitted panel never overflows its room. */
export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
