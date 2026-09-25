// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ComponentPropsWithRef, DragEvent, KeyboardEvent, MouseEvent, ReactNode, RefObject } from 'react';
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

/** A tab closed from the keyboard, and the neighbour to focus once it is gone. */
export interface PendingFocus {
  closing: string;
  next: string | null;
}

/** The tab being dragged, and the tab and side it would drop on. */
export interface TabDrag {
  id: string;
  over: string | null;
  side: DropSide;
}

/** Which edges the strip can scroll past. */
export interface ScrollEdges {
  left: boolean;
  right: boolean;
}

/** What a key on a focused tab acts on, from the strip: its element, its tabs and the callbacks to report to. */
export interface StripKeyContext extends Pick<EditorTabsProps, 'items' | 'onSelect' | 'onClose' | 'onReorder'> {
  scroller: HTMLElement | null;
  pendingFocus: RefObject<PendingFocus | null>;
}

export interface TabProps {
  item: EditorTabItem;
  active: boolean;
  focusable: boolean;
  pillId: string;
  reduce: boolean;
  drop: DropSide | null;
  draggable: boolean;
  renderLabel?: EditorTabsProps['renderLabel'];
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, id: string) => void;
  onReveal: (el: HTMLElement | null) => void;
  onContextMenu?: EditorTabsProps['onTabContextMenu'];
  onDoubleClick?: EditorTabsProps['onTabDoubleClick'];
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}
