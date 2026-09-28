import type { BrowserInfo } from '@common/types';
import { BrowserIcon } from '@/entities/browser';

export interface BrowserRowProps {
  browser: BrowserInfo;
  /** The page can't be opened elsewhere (none is shown, or it isn't on the web). */
  disabled: boolean;
  onOpen(browser: BrowserInfo): void;
}

/** A browser in the menu: its icon, name and version; choosing it opens the page there. */
export function BrowserRow({ browser, disabled, onOpen }: BrowserRowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpen(browser)}
      data-testid="browser-row"
      data-browser-id={browser.id}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors duration-150 hover:bg-hover focus-visible:bg-hover disabled:pointer-events-none disabled:opacity-40"
    >
      <BrowserIcon browser={browser} size={20} />
      <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{browser.name}</span>
      {browser.version ? <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{browser.version}</span> : null}
    </button>
  );
}
