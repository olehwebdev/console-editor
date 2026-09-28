import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { BrowserInfo } from '@common/types';
import { icons, KEY } from '@/shared/config';
import { webAddress } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { Spinner } from '@/shared/ui/spinner';
import { selectShownBrowsers, useBrowserStore } from '@/entities/browser';
import { usePageStore } from '@/entities/page';
import { matchesBrowser, openInBrowser } from '../model';
import { BrowserRow } from './BrowserRow';

export interface BrowserMenuProps {
  onClose(): void;
  /** Shows Settings › Browsers (only where the editor's settings are). */
  onShowSettings?: () => void;
}

/** The browser menu's content: a search, and each browser offered; choosing one opens the page there. */
export function BrowserMenu({ onClose, onShowSettings }: BrowserMenuProps) {
  const [query, setQuery] = useState('');
  const browsers = useBrowserStore(useShallow(selectShownBrowsers));
  const loaded = useBrowserStore((s) => s.loaded);
  const onWeb = usePageStore((s) => webAddress(s.page.url) !== '');
  const matches = browsers.filter((b) => matchesBrowser(b, query.trim()));
  const open = (browser: BrowserInfo) => {
    onClose();
    void openInBrowser(browser);
  };

  return (
    <div className="flex flex-col gap-2" data-testid="browser-menu">
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === KEY.enter && onWeb && matches[0]) open(matches[0]);
          }}
          placeholder="Search browsers…"
          aria-label="Search browsers"
          leading={<Icon icon={icons.SearchIcon} size={14} />}
          className="flex-1"
        />
        {onShowSettings ? <IconButton icon={icons.SettingsIcon} label="Browser settings" size="sm" onClick={onShowSettings} /> : null}
      </div>
      {onWeb ? null : <p className="px-2 text-[12px] text-fg-subtle">Open a website first, then open it in another browser from here.</p>}
      <div className="flex max-h-80 flex-col overflow-y-auto">
        {matches.map((browser) => (
          <BrowserRow key={browser.id} browser={browser} disabled={!onWeb} onOpen={open} />
        ))}
        {!loaded ? <Spinner className="mx-auto my-3 text-fg-subtle" label="Looking for browsers" /> : null}
        {loaded && !matches.length ? (
          <p className="px-2 py-3 text-center text-[12px] text-fg-subtle">{browsers.length ? 'No browser matches.' : 'No other browsers were found. Add one in Settings › Browsers.'}</p>
        ) : null}
      </div>
    </div>
  );
}
