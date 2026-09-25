/** Refuses rule input whose `field` has the wrong shape (from IPC or disk). */
export function invalidRule(field: string): never {
  throw new Error(`Invalid rule: ${field}`);
}
