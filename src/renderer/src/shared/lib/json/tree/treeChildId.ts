/** A child's id under its parent's: its key as a JSON Pointer escapes it (`~0` for `~`, `~1` for `/`); a repeated key gets its place too. */
export function treeChildId(parentId: string, key: string | number, repeat?: number): string {
  const segment = String(key).replaceAll('~', '~0').replaceAll('/', '~1');
  return `${parentId}/${segment}${repeat === undefined ? '' : `#${repeat}`}`;
}
