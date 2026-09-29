import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Popover } from '@/shared/ui/popover';
import { Tooltip } from '@/shared/ui/tooltip';
import { selectShownBrowsers, useBrowserStore } from '@/entities/browser';
import { loadBrowsers } from '../model';
import { BrowserCluster } from './BrowserCluster';
import { BrowserMenu, type BrowserMenuProps } from './BrowserMenu';

/** Beside the address bar: the browsers' icons, opening the menu that opens the page in one of them. */
export function BrowserMenuButton({ onShowSettings }: Pick<BrowserMenuProps, 'onShowSettings'>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const browsers = useBrowserStore(useShallow(selectShownBrowsers));
  return (
    <>
      <Tooltip content="Open in another browser" describeTrigger={false}>
        <button
          type="button"
          aria-label="Open in another browser"
          aria-expanded={open}
          data-testid="browser-menu-button"
          onClick={(event) => {
            setAnchor(event.currentTarget);
            setOpen(!open);
            if (!open) void loadBrowsers();
          }}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md outline-none transition-colors duration-150 hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <BrowserCluster browsers={browsers} />
        </button>
      </Tooltip>
      <Popover open={open} onOpenChange={setOpen} anchor={anchor} side="bottom" label="Open in another browser" className="w-[340px] max-w-[calc(100vw-32px)]">
        <BrowserMenu
          onClose={() => setOpen(false)}
          onShowSettings={
            onShowSettings &&
            (() => {
              setOpen(false);
              onShowSettings();
            })
          }
        />
      </Popover>
    </>
  );
}
