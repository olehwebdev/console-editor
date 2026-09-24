// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';

export interface CommandItem {
  /** Unique within its group. */
  id: string;
  label: string;
  /** Secondary text on the right (a path, a host, a state). Also searched. */
  hint?: string;
  icon?: IconGlyph;
  /** Shortcut hint, e.g. `['mod', 'S']`. */
  shortcut?: string[];
  /** Extra search terms (not shown). */
  keywords?: string[];
  /** Runs after the palette has closed and focus has gone back to where it was. */
  onSelect: () => void;
}

export interface CommandGroup {
  heading: string;
  items: CommandItem[];
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandGroup[];
  placeholder?: string;
  /** Shown when nothing matches. Default "No matching commands". */
  emptyMessage?: ReactNode;
  /** Extra classes for the panel. */
  className?: string;
}

export interface Result {
  item: CommandItem;
  indices: number[];
  score: number;
}

export type Row =
  | { kind: 'heading'; key: string; heading: string }
  | { kind: 'item'; key: string; result: Result; ordinal: number; group: number };

/** Down the list (1) or up it (-1). */
export type Direction = 1 | -1;

/** What the palette's keys do, bound to the panel's current results. */
export interface PaletteKeyActions {
  /** Moves the highlight one row, wrapping around the ends. */
  step: (direction: Direction) => void;
  /** Moves the highlight a page of rows, stopping at the ends. */
  page: (direction: Direction) => void;
  /** Runs the highlighted row, if any. */
  runActive: () => void;
  close: () => void;
}

export type PaletteKeyHandler = (event: ReactKeyboardEvent<HTMLDivElement>, palette: PaletteKeyActions) => void;
