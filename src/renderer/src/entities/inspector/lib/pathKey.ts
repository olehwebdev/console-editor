/** A node of the Components tree as a key: its path joined (the top level's is ''). */
export function pathKey(path: readonly number[]): string {
  return path.join('/');
}
