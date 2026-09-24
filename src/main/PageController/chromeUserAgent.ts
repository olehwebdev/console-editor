/**
 * Some sites (and Google sign-in) treat embedded browsers differently; drop the
 * Electron/app tokens so the page sees a regular Chrome user agent.
 */
export function chromeUserAgent(ua: string): string {
  return ua.replace(/\s(Electron|console-editor|Console Editor)\/\S+/gi, '');
}
