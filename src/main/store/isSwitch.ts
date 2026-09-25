/** Whether a setting's value is on or off. */
export function isSwitch(value: unknown): boolean {
  return typeof value === 'boolean';
}
