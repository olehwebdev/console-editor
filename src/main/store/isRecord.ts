/** Whether a value is a plain object (not null, not an array): what untrusted input must be to be read field by field. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
