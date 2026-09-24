export function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(`${name} must be a string`);
}
