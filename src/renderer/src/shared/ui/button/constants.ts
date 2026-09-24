import type { ButtonSize } from './Button';

/** The glyph size of an icon in a button's leading or trailing slot, by the button's size. */
export const BUTTON_ICON_SIZE = { sm: 12, md: 14 } as const satisfies Record<ButtonSize, number>;
