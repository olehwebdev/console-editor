import { useEffect, useRef, useState } from 'react';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { Spinner } from '@/shared/ui/spinner';
import { usePageStore } from '@/entities/page';
import { navigate } from '@/features/navigate-page';

export interface AddressBarProps {
  /** Receives the input element so "Focus Address Bar" (Ctrl/Cmd+L) can reach it. */
  inputRef?: (el: HTMLInputElement | null) => void;
  className?: string;
}

/** URL field of the preview: shows the page URL, navigates on Enter. */
export function AddressBar({ inputRef, className }: AddressBarProps) {
  const url = usePageStore((s) => s.page.url);
  const loading = usePageStore((s) => s.page.loading);
  const [draft, setDraft] = useState(url);
  const [editing, setEditing] = useState(false);
  const local = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(url);
  }, [url, editing]);

  const secure = url.startsWith('https://');
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
        <Spinner size={14} className="text-accent" />
      ) : (
        <Icon icon={icons.GlobeIcon} size={14} className={secure ? 'text-live/80' : 'text-fg-subtle'} />
      )}
      <input
        ref={(el) => {
          local.current = el;
          inputRef?.(el);
        }}
        data-testid="address-bar"
        value={draft}
        spellCheck={false}
        autoComplete="off"
        placeholder="Enter a URL — https://example.com or localhost:3000"
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setEditing(true);
          e.target.select();
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft.trim()) {
            void navigate(draft);
            local.current?.blur();
          } else if (e.key === 'Escape') {
            setDraft(url);
            local.current?.blur();
          }
        }}
        className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-fg outline-none placeholder:font-sans placeholder:text-fg-subtle"
      />
    </label>
  );
}
