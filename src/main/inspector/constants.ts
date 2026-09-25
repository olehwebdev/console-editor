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
export const ADAPTER_MODE = { summary: 'summary', describe: 'describe', set: 'set', tree: 'tree', locate: 'locate' } as const;
/** The internal property V8 gives a function's place under. */
export const FUNCTION_LOCATION = '[[FunctionLocation]]';
/** What a read says when its element is gone. */
export const PICK_GONE = 'That element is gone: the page moved on since it was picked.';
/** The View menu's Pick an Element item. */
export const PICK_MENU_ID = 'pick-element';
/** The largest new state value taken, as JSON. */
export const MAX_STATE_JSON = 64 * 1024;
/** What a set says when the value can't be set there, or isn't JSON. */
export const NOT_SETTABLE = "That value can't be set: only a useState hook, a class's state, Vue's data or a writable ref can.";
export const NOT_JSON = 'Write the new value as JSON: "text", 42, true, null, [1, 2] or {"key": 1}.';
/** The most components a level of the Components tree lists (the rest are counted). */
export const MAX_TREE_NODES = 500;
/** The deepest path into the Components tree taken. */
export const MAX_TREE_DEPTH = 400;
/** Elements looked through for React's root containers when no hook lists the roots. */
export const MAX_ROOT_SCAN = 5000;
/** What opening or highlighting a node of the Components tree says when there's nothing to show. */
export const NO_ELEMENT = 'That component renders no element, or the tree changed: read it again.';
/** What the tree says when its frame is gone, or isn't recorded (it needs the console's frames). */
export const FRAME_GONE = "That frame is gone, or the console isn't recording it.";
export const TREE_GROUP_PREFIX = 'inspector-tree-';
/**
 * The binding the hook stand-in hands its commits to (`Runtime.addBinding`), a global of each document while
 * renders are recorded: its being there is what turns the stand-in's recording on.
 */
export const RENDERS_BINDING = '__consoleEditorRenders';
/** The hook stand-in's lookup of the component functions its commits name by id. */
export const RENDERED_TYPES = '__consoleEditorTypes';
/** How often the stand-in hands over the commits it summed up. */
export const RENDERS_FLUSH_MS = 100;
/** The most components a commit lists (the rest are counted), commits a batch holds, and changes a reason lists. */
export const MAX_RENDERED = 200;
export const MAX_COMMIT_BATCH = 200;
export const MAX_CHANGES = 20;
/** The largest batch taken from the page. */
export const MAX_RENDERS_PAYLOAD = 4 * 1024 * 1024;
export const RENDERS_GROUP_PREFIX = 'inspector-renders-';
/** Documents whose component functions are kept located, the oldest dropped first. */
export const MAX_LOCATED_DOCUMENTS = 50;
/** How many of a frame's scripts without a source map the page stack names. */
export const MAX_UNMAPPED = 5;
/** Scripts V8 lists that come from files the page loaded, not code it evaluated. */
export const LOADED_SCRIPT = /^https?:/;
