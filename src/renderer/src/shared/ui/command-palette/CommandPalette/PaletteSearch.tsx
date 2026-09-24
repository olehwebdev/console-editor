// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { RefObject } from 'react';
import { SearchIcon } from '@/shared/config/icons';
import { Icon } from '@/shared/ui/icon';

interface PaletteSearchProps {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  /** The listbox the input controls. */
  listId: string;
  /** The highlighted option's id, if any. */
  activeDescendant: string | undefined;
}

/** The search row: the palette's one focus stop, a combobox that drives the list. */
export function PaletteSearch({ inputRef, query, onQueryChange, placeholder, listId, activeDescendant }: PaletteSearchProps) {
  return (
    <div className="flex h-12 items-center gap-2.5 border-b border-line px-4">
      <Icon icon={SearchIcon} size={16} className="text-fg-subtle" />
      <input
        ref={inputRef}
        autoFocus
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
      />
    </div>
  );
}
