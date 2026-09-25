/** Resolves after `ms` (at once for 0): how long a response override holds its answer back. */
export function holdFor(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
