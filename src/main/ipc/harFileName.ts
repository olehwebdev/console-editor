/** What an exported HAR is called at first: the page's host and the time (`shop.test-2026-09-25T17-04-05.har`). */
export function harFileName(pageUrl: string): string {
  const host = URL.canParse(pageUrl) ? new URL(pageUrl).hostname : '';
  const time = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
  return `${host || 'requests'}-${time}.har`;
}
