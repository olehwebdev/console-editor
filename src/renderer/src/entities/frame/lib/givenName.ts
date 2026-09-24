/** The name given to the frame with this key, or '' (own names only: `names` comes from outside). */
export function givenName(names: Readonly<Record<string, string>>, key: string): string {
  return Object.hasOwn(names, key) ? names[key]! : '';
}
