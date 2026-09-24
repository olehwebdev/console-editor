import type { IconGlyph } from '@/shared/ui/icon';

/** A selectable row in a `Menu` or `ContextMenu`. */
export interface MenuAction {
  /** Visible text; typeahead matches against it. */
  label: string;
  icon?: IconGlyph;
  /** Shortcut hint, e.g. `['mod', 'S']` (informational only; rendered with `<Kbd/>`). */
  shortcut?: string[];
  /** Destructive action: tinted red, red highlight. */
  danger?: boolean;
  disabled?: boolean;
  /** Toggle rows: `true`/`false` shows a check slot and makes the row a `menuitemcheckbox`. */
  checked?: boolean;
  /** Runs after the menu has closed and focus has returned to where it was. */
  onSelect: () => void;
  separator?: false;
}

/** A hairline between groups of actions. */
export interface MenuSeparator {
  separator: true;
}

export type MenuItem = MenuAction | MenuSeparator;

export type MenuAlign = 'start' | 'end';
export type MenuSide = 'bottom' | 'top';

export function isMenuSeparator(item: MenuItem): item is MenuSeparator {
  return item.separator === true;
}
