/** A time or duration the page sent (ms): finite and not negative, else null. */
export function timeOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
