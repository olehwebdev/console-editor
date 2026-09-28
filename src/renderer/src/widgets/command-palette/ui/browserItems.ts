import type { BrowserInfo } from '@common/types';
import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import { canDrive } from '@/entities/browser';
import { openInBrowser, openWithChanges } from '@/features/browser/open-in-browser';

/** Palette items' id prefixes: opening the page in a browser, and in one the app drives, with the workspace's changes. */
const OPEN_IN_PREFIX = 'open-in:';
const OPEN_CHANGED_PREFIX = 'open-changed:';

/** Opening the page in each browser offered, and in each one the app drives with the workspace's changes, while it is on the web. */
export function browserItems(browsers: BrowserInfo[], onWeb: boolean): CommandItem[] {
  if (!onWeb) return [];
  return browsers.flatMap((browser) => [
    {
      id: `${OPEN_IN_PREFIX}${browser.id}`,
      label: `Open in ${browser.name}`,
      icon: icons.BrowserIcon,
      keywords: ['browser', 'other browser', browser.engine],
      onSelect: () => void openInBrowser(browser),
    },
    ...(canDrive(browser)
      ? [
          {
            id: `${OPEN_CHANGED_PREFIX}${browser.id}`,
            label: `Open in ${browser.name} with your changes`,
            icon: icons.OverridesIcon,
            keywords: ['browser', 'overrides', 'rules', 'changes', browser.engine],
            onSelect: () => void openWithChanges(browser),
          },
        ]
      : []),
  ]);
}
