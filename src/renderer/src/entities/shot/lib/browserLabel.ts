import type { ShotBrowser } from '@common/types';

/** The browser a capture was taken in, with its major version: `Firefox 143`. */
export function browserLabel(browser: ShotBrowser): string {
  const major = browser.version?.split('.')[0];
  return `${browser.name}${major ? ` ${major}` : ''}`;
}
