/** A count the page sent: a whole number above zero, else 0. */
export function countOf(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}
