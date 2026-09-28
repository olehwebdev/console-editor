import type { BrowserInfo } from '@common/types';
import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import { openInBrowser } from '@/features/browser/open-in-browser';

/** A palette item's id prefix for opening the page in a browser. */
const OPEN_IN_PREFIX = 'open-in:';

/** Opening the page in each browser offered, while it is on the web. */
export function browserItems(browsers: BrowserInfo[], onWeb: boolean): CommandItem[] {
  if (!onWeb) return [];
  return browsers.map((browser) => ({
    id: `${OPEN_IN_PREFIX}${browser.id}`,
    label: `Open in ${browser.name}`,
    icon: icons.BrowserIcon,
    keywords: ['browser', 'other browser', browser.engine],
    onSelect: () => void openInBrowser(browser),
  }));
}
