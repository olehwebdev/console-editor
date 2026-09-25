/** Digits of a clock's milliseconds. */
const MS_DIGITS = 3;

/** A time as a clock shows it, to the millisecond (14:03:07.123). */
export function formatClock(at: number): string {
  const time = new Date(at);
  return `${time.toLocaleTimeString([], { hour12: false })}.${String(time.getMilliseconds()).padStart(MS_DIGITS, '0')}`;
}
