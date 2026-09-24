import { useState } from 'react';
import { icons, KEY } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { Spinner } from '@/shared/ui/spinner';
import { usePageStore } from '@/entities/page';
import { submitAddress } from './submitAddress';

/** The scheme that gets the globe its "secure" colour. */
const SECURE_SCHEME = 'https://';

/** The loading spinner and the globe take turns in the same slot. */
const STATUS_ICON_SIZE = 14;

/** What a key does in the field, given the field and what is typed. */
const KEY_ACTIONS: Readonly<Record<string, (input: HTMLInputElement, value: string) => void>> = {
  [KEY.enter]: submitAddress,
  [KEY.escape]: (input) => input.blur(),
};

export interface AddressBarProps {
  /** Receives the input element so "Focus Address Bar" (Ctrl/Cmd+L) can reach it. */
  inputRef?: (el: HTMLInputElement | null) => void;
  className?: string;
}

/** URL field of the preview: shows the page URL, navigates on Enter. */
export function AddressBar({ inputRef, className }: AddressBarProps) {
  const url = usePageStore((s) => s.page.url);
  const loading = usePageStore((s) => s.page.loading);
  /** What is being typed; null while not editing, so the field follows the page's URL. */
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? url;

  const secure = url.startsWith(SECURE_SCHEME);
  return (
    <label
      className={cn(
        'group flex h-7 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-surface-raised/70 px-3',
        'transition-[border-color,background-color,box-shadow] duration-150 ease-out-expo',
        'focus-within:border-accent/50 focus-within:bg-surface-raised focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--accent)_14%,transparent)]',
        className,
      )}
    >
      {loading ? (
        <Spinner size={STATUS_ICON_SIZE} className="text-accent" />
      ) : (
        <Icon icon={icons.GlobeIcon} size={STATUS_ICON_SIZE} className={secure ? 'text-live/80' : 'text-fg-subtle'} />
      )}
      <input
        ref={inputRef}
        data-testid="address-bar"
        value={value}
        spellCheck={false}
        autoComplete="off"
        placeholder="Enter a URL — https://example.com or localhost:3000"
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setDraft(url);
          e.target.select();
        }}
        // Leaving the field (Enter and Escape blur it) drops the draft.
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (Object.hasOwn(KEY_ACTIONS, e.key)) KEY_ACTIONS[e.key](e.currentTarget, value);
        }}
        className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-fg outline-none placeholder:font-sans placeholder:text-fg-subtle"
      />
    </label>
  );
}
