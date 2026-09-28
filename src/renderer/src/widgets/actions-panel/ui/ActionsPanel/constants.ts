import { icons } from '@/shared/config';
import type { IconGlyph } from '@/shared/ui/icon';
import { attachActions, detachActions } from '@/features/action/detach';
import type { ActionsPlacement } from './types';

/** A workspace with no frame names yet: one shared object, so selecting it never re-renders. */
export const NO_NAMES: Readonly<Record<string, string>> = {};

/** The result line's glyph. */
export const RESULT_ICON_SIZE = 12;

/** Where a value's lines break: the result line shows each value's first (an error's message, not its stack). */
export const NEWLINE = '\n';

/** The header's button that moves the panel to the other place, by where it is. */
export const MOVE_BUTTON: Record<ActionsPlacement, { icon: IconGlyph; label: string; move(): Promise<void> }> = {
  sidebar: { icon: icons.PopOutIcon, label: 'Open in its own window', move: detachActions },
  window: { icon: icons.DockIcon, label: 'Put back in the sidebar', move: attachActions },
};

/**
 * The header's spacing and role, by where it is. As the Actions window's top bar it also takes the place of Linux's
 * title bar: dragged to move the window (its buttons still clicked), with room at its right end for the window buttons
 * drawn over it (--titlebar-controls-w, 0 elsewhere). In the sidebar it is only the panel's.
 */
export const HEADER_PLACEMENT_CLASS: Record<ActionsPlacement, string> = {
  sidebar: 'pl-4 pr-2',
  window: 'pl-4 pr-[calc(0.5rem+var(--titlebar-controls-w))] [app-region:drag] [&_button]:[app-region:no-drag]',
};
