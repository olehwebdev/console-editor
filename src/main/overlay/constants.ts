import type { OverlaySettings } from '../../shared/types';

/** The isolated world the overlay's code runs in: the page's scripts can't reach its functions (only the element). */
export const OVERLAY_WORLD = 'console-editor-overlay';

/** The overlay's controller, a global of its world. */
export const OVERLAY_GLOBAL = '__consoleEditorOverlay';

/** The overlay's element's id in the page. */
export const OVERLAY_ELEMENT_ID = '__console-editor-overlay';

/** A new overlay: half see-through, where the page starts, scrolling with it, the page at the design's width. */
export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = { opacity: 0.5, blend: 'normal', invert: false, x: 0, y: 0, attached: 'page', hidden: false, fitWidth: true };

/** Above anything the page stacks. */
export const TOP_LAYER = 2147483647;

/** The blend that needs a backdrop, what a page with no background of its own is given as one, and how "none" computes. */
export const DIFFERENCE = 'difference';
export const BACKDROP = '#ffffff';
export const TRANSPARENT = 'rgba(0, 0, 0, 0)';
