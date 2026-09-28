import type { FoundBrowser } from '../../types';
import { PACKAGE_LABELS } from './constants';

/** The browsers, a name that two share given where each came from (`Firefox (Snap)`), so the menu tells them apart. */
export function labelDuplicates(found: { browser: FoundBrowser; path: string }[]): FoundBrowser[] {
  const count = new Map<string, number>();
  for (const { browser } of found) count.set(browser.name, (count.get(browser.name) ?? 0) + 1);
  return found.map(({ browser, path }) => {
    const label = (count.get(browser.name) ?? 0) > 1 ? PACKAGE_LABELS.find(([pattern]) => pattern.test(path))?.[1] : undefined;
    return label ? { ...browser, name: `${browser.name} (${label})` } : browser;
  });
}
