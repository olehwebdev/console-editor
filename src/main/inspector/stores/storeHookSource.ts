import { MAX_ACTION_BATCH, STORE_HOOK_GLOBAL, STORES_BINDING, STORES_FLUSH_MS, VUE_ATTACH_DELAY_MS } from './constants';
import { REDUX_STAND_IN_JS } from './reduxStandInSource';
import { STORE_STACK_JS } from './storeStackSource';
import { STORE_STATE_JS } from './storeStateSource';
import { VUE_STORES_JS } from './vueStoresSource';

/**
 * Put in every new document while **Framework hooks** is on, in the same script
 * as the React stand-in (`HOOKS_SOURCE`, which gives it `lastAction`): the store
 * stand-in. It hears Redux's, NgRx's and Zustand's actions through the Redux
 * DevTools extension's API (`REDUX_STAND_IN_JS`), and Pinia's and Vuex's through
 * their own (`VUE_STORES_JS`, attached as a document loads and a moment after,
 * and whenever recording starts). While store actions are recorded (the binding is there),
 * each action is summed up with what it changed and the stack that dispatched it,
 * and handed over every `STORES_FLUSH_MS`. The timer, `JSON.stringify` and
 * `addEventListener` are the ones the page started with, before it could wrap them.
 */
export const STORE_HOOK_JS = `
  if ('${STORE_HOOK_GLOBAL}' in window) return;
  const stringify = JSON.stringify;
  const later = window.setTimeout.bind(window);
  const listen = window.addEventListener.bind(window);
  const now = () => performance.timeOrigin + performance.now();
  const recording = () => typeof window.${STORES_BINDING} === 'function';
  const names = new Map();
  // The libraries whose stores were heard of, for the page stack.
  const libraries = new Set();
  const storeName = (base) => {
    const count = (names.get(base) || 0) + 1;
    names.set(base, count);
    return count > 1 ? base + ' ' + count : base;
  };
  let pending = [];
  let timer = 0;
  const flush = () => {
    timer = 0;
    const batch = pending;
    pending = [];
    if (recording()) window.${STORES_BINDING}(stringify(batch));
  };
  const note = (store, action) => {
    lastAction.store = store;
    lastAction.type = action && typeof action === 'object' ? String(action.type) : String(action);
    lastAction.at = performance.now();
  };
  const record = (entry) => {
    note(entry.store, entry);
    if (pending.length < ${MAX_ACTION_BATCH}) pending.push(Object.assign({ at: now() }, entry));
    if (!timer) timer = later(flush, ${STORES_FLUSH_MS});
  };
  ${STORE_STACK_JS}
  ${STORE_STATE_JS}
  ${REDUX_STAND_IN_JS}
  ${VUE_STORES_JS}
  Object.defineProperty(window, '${STORE_HOOK_GLOBAL}', { configurable: true, value: Object.freeze({ attach, detach, libraries: () => [...libraries] }) });
  // Most apps have mounted by the time the document loads; a later one, a moment after.
  listen('load', () => {
    if (recording()) attach();
    later(() => recording() && attach(), ${VUE_ATTACH_DELAY_MS});
  });
`;
