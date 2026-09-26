/**
 * Where a store's actions are heard from: Redux's store enhancer (Redux, Redux Toolkit), a connection
 * through the Redux DevTools extension's API (NgRx's StoreDevtools, Zustand's devtools, others), Pinia
 * and Vuex.
 */
export const STORE_LIBRARIES = ['redux', 'devtools', 'pinia', 'vuex'] as const;
export type StoreLibrary = (typeof STORE_LIBRARIES)[number];

/** A call of the stack that dispatched an action, in a file the page loaded (0-based line and column, as CDP's). */
export interface StackFrame {
  /** The function's name, as V8 tells it (`CartItem.handleAdd`); '' for an anonymous one. */
  name: string;
  url: string;
  line: number;
  column: number;
}

/** A value of the store's state that the action changed: its path (`cart.count`) and previews before and after. */
export interface StoreChange {
  path: string;
  from: string;
  to: string;
}

/** An action a store handled in a frame, as the framework hooks heard it while store actions were recorded. */
export interface StoreAction {
  /** In the order main received them, from 1. */
  id: number;
  frameId: string | null;
  /** When the store handled it (ms since the epoch). */
  at: number;
  /** The store's name: its Pinia id, the name its connection gave, or `Redux` (numbered when a frame has several). */
  store: string;
  library: StoreLibrary;
  /**
   * The action's type (Redux, NgRx), the action's name (Pinia), the mutation's type (Vuex), or how Pinia's
   * state was changed outside an action (`direct`, `patch object`, `patch function`).
   */
  type: string;
  /** A preview of what it carried (its payload, or an action's arguments); null when nothing. */
  payload: string | null;
  /** The state's values it changed, two levels deep at most. */
  changes: StoreChange[];
  /** How long the store took to handle it (ms), where it is measured (Redux's reducers, Pinia's actions); else null. */
  duration: number | null;
  /** The stack that dispatched it, innermost first: the store library's own calls, then the app's. */
  stack: StackFrame[];
}

/** The last action a store handled before a commit, when React committed right after it (in the same task or the next). */
export interface ActionTrigger {
  store: string;
  type: string;
}
