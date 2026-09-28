/** Whether `bytes` has `prefix` at `at`. */
export function startsWith(bytes: Buffer, prefix: readonly number[], at = 0): boolean {
  return bytes.length >= at + prefix.length && prefix.every((b, i) => bytes[at + i] === b);
}
