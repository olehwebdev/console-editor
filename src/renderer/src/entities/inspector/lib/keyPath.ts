/** The path a `pathKey` stands for. */
export function keyPath(key: string): number[] {
  return key ? key.split('/').map(Number) : [];
}
