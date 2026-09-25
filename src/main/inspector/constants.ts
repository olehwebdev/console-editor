/** How long after a frame stops loading it is looked at: frameworks mount once their scripts have run. */
export const DETECT_DELAY_MS = 1000;
/** A frame busy in a loop doesn't hold a scan up longer than this. */
export const DETECT_TIMEOUT_MS = 5000;
/** At most this many findings are taken from a frame. */
export const MAX_HITS = 40;
/** What a version the page reports must look like to be shown. */
export const VERSION_PATTERN = /^[\w.+-]{1,40}$/;
/** How often, at most, what is under the pointer is read while picking. */
export const HOVER_INTERVAL_MS = 100;
/** Picked elements kept by handle; an older one's handles are released. */
export const MAX_PICKS = 20;
/** Object groups: one per pick, one per read of a component, one for what is under the pointer. */
export const PICK_GROUP_PREFIX = 'inspector-pick-';
export const READ_GROUP_PREFIX = 'inspector-read-';
export const HOVER_GROUP = 'inspector-hover';
/** The longest text taken from what the page says (a preview, a name). */
export const MAX_TEXT_LENGTH = 160;
/** The most chain links, values, contexts, handlers or names taken from the page. */
export const MAX_LIST_ITEMS = 60;
/** Characters never shown from what the page says. */
export const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
/** How Chromium draws the element under the pointer: in DevTools' colours. */
export const HIGHLIGHT_CONFIG = {
  showInfo: true,
  contentColor: { r: 111, g: 168, b: 220, a: 0.66 },
  paddingColor: { r: 147, g: 196, b: 125, a: 0.55 },
  marginColor: { r: 246, g: 178, b: 107, a: 0.66 },
};
/** Overlay.setInspectMode's modes. */
export const INSPECT_MODE = { pick: 'searchForNode', off: 'none' } as const;
/** The adapter's two ways of answering (`ADAPTER_SOURCE`). */
export const ADAPTER_MODE = { summary: 'summary', describe: 'describe' } as const;
/** The internal property V8 gives a function's place under. */
export const FUNCTION_LOCATION = '[[FunctionLocation]]';
/** What a read says when its element is gone. */
export const PICK_GONE = 'That element is gone: the page moved on since it was picked.';
/** The View menu's Pick an Element item. */
export const PICK_MENU_ID = 'pick-element';
