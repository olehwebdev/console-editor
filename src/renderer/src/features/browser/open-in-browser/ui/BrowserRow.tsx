import type { BrowserInfo } from '@common/types';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { BrowserIcon } from '@/entities/browser';

export interface BrowserRowProps {
  browser: BrowserInfo;
  /** The page can't be opened elsewhere (none is shown, or it isn't on the web). */
  disabled: boolean;
  /** The app drives it with the workspace's changes (it is marked). */
  driven: boolean;
  onOpen(browser: BrowserInfo): void;
  onOpenWithChanges(browser: BrowserInfo): void;
}

/**
 * A browser in the menu: its icon, name and version; choosing it opens the page there. A Chromium browser also offers
 * opening it with the workspace's changes, in a profile of the app's own.
 */
export function BrowserRow({ browser, disabled, driven, onOpen, onOpenWithChanges }: BrowserRowProps) {
  return (
    <div data-testid="browser-row" data-browser-id={browser.id} className="flex items-center gap-1 rounded-lg transition-colors duration-150 hover:bg-hover">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onOpen(browser)}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none focus-visible:bg-hover disabled:pointer-events-none disabled:opacity-40"
      >
        <BrowserIcon browser={browser} size={20} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{browser.name}</span>
        {driven ? <span className="size-1.5 shrink-0 rounded-full bg-accent" title="Open with your changes" data-testid="browser-driven" /> : null}
        {browser.version ? <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{browser.version}</span> : null}
      </button>
      {browser.engine === 'chromium' ? (
        <IconButton
          icon={icons.OverridesIcon}
          label={`Open in ${browser.name} with your changes`}
          size="sm"
          disabled={disabled}
          onClick={() => onOpenWithChanges(browser)}
          data-testid="browser-open-with-changes"
          className="mr-1"
        />
      ) : null}
    </div>
  );
}
