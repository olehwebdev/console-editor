/**
 * The binding the store stand-in hands the actions it heard to (`Runtime.addBinding`), a global of each
 * document while store actions are recorded: its being there is what turns the recording on.
 */
export const STORES_BINDING = '__consoleEditorStores';
/**
 * The stand-in's own global: `attach()` finds a frame's Vue apps and listens to their Pinia and Vuex stores;
 * `libraries()` says which libraries' stores it heard of (`redux`), for the page stack.
 */
export const STORE_HOOK_GLOBAL = '__consoleEditorStoreHook';
/** The Redux DevTools extension's globals, which Redux Toolkit, NgRx's StoreDevtools and Zustand's devtools look for. */
export const REDUX_EXTENSION_GLOBAL = '__REDUX_DEVTOOLS_EXTENSION__';
export const REDUX_COMPOSE_GLOBAL = '__REDUX_DEVTOOLS_EXTENSION_COMPOSE__';
/** The action NgRx's StoreDevtools wraps the app's actions in before it sends them. */
export const NGRX_PERFORM_ACTION = 'PERFORM_ACTION';
/** How often the stand-in hands over the actions it heard, and the most a batch holds. */
export const STORES_FLUSH_MS = 100;
export const MAX_ACTION_BATCH = 200;
/** The largest batch taken from the page. */
export const MAX_STORES_PAYLOAD = 4 * 1024 * 1024;
/** How deep V8 records a dispatch's stack, and how many calls in files the page loaded are kept of it. */
export const STACK_TRACE_LIMIT = 50;
export const MAX_STACK_FRAMES = 50;
/** A state is compared this many levels deep, at most this many keys a level and paths in all. */
export const STATE_DEPTH = 2;
export const MAX_STATE_KEYS = 100;
export const MAX_STATE_PATHS = 300;
/** The most changes an action lists. */
export const MAX_STORE_CHANGES = 20;
/** How much of a value is written out to tell whether it changed (a mutable store's), and how much of it is shown. */
export const SIGNATURE_LENGTH = 400;
export const PREVIEW_LENGTH = 80;
/** How many levels of a value are written out. */
export const TEXT_DEPTH = 3;
/** A React commit this soon after a store action names that action as what led to it. */
export const ACTION_TRIGGER_MS = 250;
/** How long after a document loads its Vue apps are looked for again (one that mounts late). */
export const VUE_ATTACH_DELAY_MS = 1000;
/** Elements looked through for a Vue 2 root instance. */
export const MAX_VUE2_SCAN = 2000;
/** The longest URL taken for a call of a dispatch's stack. */
export const MAX_FRAME_URL = 2048;
