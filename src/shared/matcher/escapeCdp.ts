/** Escapes a literal for a CDP Fetch url pattern (`*` and `?` are wildcards, `\` escapes). */
export function escapeCdp(text: string): string {
  return text.replace(/[\\*?]/g, '\\$&');
}
