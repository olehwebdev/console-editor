/**
 * Chromium's largest texture side, in device pixels: a capture taller than this comes back cut or blank, so a full
 * page is captured down to it.
 */
export const MAX_TEXTURE_SIDE = 16_384;

/** A PNG's width and height, big-endian, after its signature and the IHDR chunk's length and type. */
export const PNG_SIZE_AT = { width: 16, height: 20, minLength: 24 } as const;

/** The format captures are kept in. */
export const CAPTURE_FORMAT = 'png';

/** Thumbnails: the top of the image (at most a square of it), this wide, as JPEG of this quality. */
export const THUMB = { width: 256, quality: 80 } as const;

/** The page's window (scrollbars included) and device pixel ratio, asked of its main world. */
export const WINDOW_METRICS = '[innerWidth, innerHeight, devicePixelRatio]';

/** Waiting for the page's view to be back on screen (a menu over it hid it) before capturing it. */
export const SHOWN_WAIT = { timeoutMs: 2000, stepMs: 50 } as const;

/** What a capture's file name ends with, by what it covers (before its width). */
export const AREA_SUFFIX = { viewport: '', page: '-full', element: '-element' } as const;

/** Characters dropped from the address a capture's file name is made of. */
export const NAME_UNSAFE = /[^a-z0-9._-]+/gi;

/** The longest part of a name made from an address. */
export const MAX_NAME_STEM = 80;

/** The capture areas asked of a page as a whole (an element's goes through its pick). */
export const PAGE_AREAS: ReadonlySet<unknown> = new Set(['viewport', 'page']);

/** The app's own page, as the browser a capture was taken in. */
export const APP_BROWSER = { id: 'app', name: 'Chromium' } as const;

/** What a design brought in without a name (pasted) is called, before its extension. */
export const DESIGN_NAME = 'design';

/** Waits for the page to have drawn twice and its fonts to be in (run in its main world, awaited). */
export const SETTLE_EXPRESSION = 'document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))';
