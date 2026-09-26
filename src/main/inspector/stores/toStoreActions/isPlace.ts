/** A line or column the page sent: a whole number, not negative. */
export function isPlace(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
