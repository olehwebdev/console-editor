/** Digits of hours to seconds, and of milliseconds. */
const CLOCK_DIGITS = 2;
const MS_DIGITS = 3;

/** A row's time as `14:03:07.215`, in local time. */
export function formatTime(time: number): string {
  const d = new Date(time);
  const pad = (n: number, digits = CLOCK_DIGITS) => String(n).padStart(digits, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), MS_DIGITS)}`;
}
