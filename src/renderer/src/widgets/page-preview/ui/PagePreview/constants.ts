import { icons } from '@/shared/config';
import type { IconGlyph } from '@/shared/ui/icon';
import { attachPage, detachPage } from '@/features/detach-page';
import type { PreviewPlacement } from './types';

/** The snapshot when capturing the page failed: the view still gets out of the overlay's way. */
export const CAPTURE_FAILED = 'unavailable';

/** The toolbar's button that moves the website to the other place, by where it is. */
export const MOVE_BUTTON: Record<PreviewPlacement, { icon: IconGlyph; label: string; move(): Promise<void> }> = {
  editor: { icon: icons.PopOutIcon, label: 'Open in its own window', move: detachPage },
  window: { icon: icons.DockIcon, label: 'Put back in the editor window', move: attachPage },
};

/**
 * The toolbar's spacing and role, by where it is. As the website's own window's top bar it also takes the place of
 * Linux's title bar: dragged to move the window (its controls still clicked), with room at its right end for the window
 * buttons drawn over it (--titlebar-controls-w, 0 elsewhere). In the editor it is only the preview's.
 */
export const TOOLBAR_PLACEMENT_CLASS: Record<PreviewPlacement, string> = {
  editor: 'px-2',
  window: 'pl-2 pr-[calc(0.5rem+var(--titlebar-controls-w))] [app-region:drag] [&_:is(button,label)]:[app-region:no-drag]',
};
