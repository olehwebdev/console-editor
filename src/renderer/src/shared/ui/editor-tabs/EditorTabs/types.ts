// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';

/** Tints the tab's icon: status tones or file-kind colors. */
export type EditorTabTone = 'neutral' | 'accent' | 'live' | 'info' | 'warning' | 'danger' | 'js' | 'css' | 'html';

export interface EditorTabItem {
  id: string;
  label: string;
  /** A Hugeicons glyph (drawn at 14 px) or any node (e.g. a kind icon). */
  icon?: IconGlyph | ReactNode;
  /** Unsaved changes: a dot that swaps with the close button on hover. */
  dirty?: boolean;
  /** Preview / not-yet-kept tab. */
  italic?: boolean;
  /** Native tooltip, e.g. the full URL. */
  title?: string;
  tone?: EditorTabTone;
}

export interface EditorTabsProps extends Omit<ComponentPropsWithRef<'div'>, 'onSelect' | 'children'> {
  items: readonly EditorTabItem[];
  activeId: string | null | undefined;
  onSelect: (id: string) => void;
  /** Close button, middle click, Delete (also Backspace on macOS) on a keyboard-focused tab. */
  onClose: (id: string) => void;
  /** Enables drag-and-drop (and Alt+Shift+←/→) reordering; receives the new id order. */
  onReorder?: (ids: string[]) => void;
  /** Custom label content (defaults to `item.label`). */
  renderLabel?: (item: EditorTabItem, state: { active: boolean }) => ReactNode;
  /** Slot after the tabs (e.g. a split or "more" IconButton). */
  trailing?: ReactNode;
  onTabContextMenu?: (id: string, event: MouseEvent<HTMLElement>) => void;
  onTabDoubleClick?: (id: string) => void;
  /** Accessible name of the tab list. */
  label?: string;
}

export type DropSide = 'before' | 'after';

/** What a key on a focused tab acts on. */
export interface TabKeyContext {
  /** The strip's tabs in order, without the ones closing. */
  tabs: HTMLElement[];
  /** The focused tab's place in `tabs`. */
  index: number;
  select: () => void;
  /** Closes the tab and moves focus to its neighbour once it is gone. */
  close: () => void;
}

/** Returns `false` when the key does nothing here, so its default action runs. */
export type TabKeyHandler = (tab: TabKeyContext) => false | void;
