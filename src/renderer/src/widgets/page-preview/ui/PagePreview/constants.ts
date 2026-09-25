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
