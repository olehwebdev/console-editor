/** What an export of overrides is called at first: the page's host (`shop.test-overrides.json`). */
export function overridesFileName(pageUrl: string): string {
  const host = URL.canParse(pageUrl) ? new URL(pageUrl).hostname : '';
  return `${host || 'workspace'}-overrides.json`;
}
