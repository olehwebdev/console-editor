/** Adds a scheme to what the user typed in the address bar. */
export function normalizeUrl(input: string): string {
  const text = input.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[\w.-]+:\d+/.test(text)) return text;
  if (/^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(text) || /^[\w.-]+:\d+(\/|$)/.test(text)) {
    return `http://${text}`;
  }
  return `https://${text}`;
}
