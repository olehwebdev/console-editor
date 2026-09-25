import { NGRX_PERFORM_ACTION, REDUX_COMPOSE_GLOBAL, REDUX_EXTENSION_GLOBAL } from './constants';

/**
 * Page-side, in the store stand-in (`STORE_HOOK_JS`): a stand-in for the Redux
 * DevTools extension's globals, put there only when the page has none. Redux
 * Toolkit's `configureStore` composes the extension in (production builds too);
 * `__REDUX_DEVTOOLS_EXTENSION__()` is the enhancer a plain Redux store adds. The
 * enhancer is innermost, as the extension's is: it hears the plain actions that
 * got through the middleware, and measures the reducers. `connect()` is how NgRx's
 * StoreDevtools and Zustand's devtools report each action with the state after
 * it; NgRx wraps the app's action (`PERFORM_ACTION`). The last action is noted for
 * the React stand-in even while nothing records (a commit names what led to it).
 */
export const REDUX_STAND_IN_JS = String.raw`
  const actionType = (action) => (action && typeof action === 'object' ? String(action.type) : String(action));
  const payloadOf = (action) => {
    if (!action || typeof action !== 'object') return null;
    if ('payload' in action) return preview(action.payload);
    const rest = Object.keys(action).filter((key) => key !== 'type');
    return rest.length ? preview(Object.fromEntries(rest.map((key) => [key, action[key]]))) : null;
  };
  const enhancer = (config) => (createStore) => (...args) => {
    const store = createStore(...args);
    const name = storeName((config && config.name) || 'Redux');
    libraries.add('redux');
    const dispatch = (action) => {
      note(name, action);
      if (!recording()) return store.dispatch(action);
      const stack = stackOf();
      const before = store.getState();
      const started = performance.now();
      const result = store.dispatch(action);
      const duration = performance.now() - started;
      record({ store: name, library: 'redux', type: actionType(action), payload: payloadOf(action), changes: diffRefs(before, store.getState()), duration, stack });
      return result;
    };
    return Object.assign({}, store, { dispatch });
  };
  const composeWith = (config, funcs) => (...args) => funcs.reduceRight((composed, f) => f(composed), enhancer(config)(...args));
  const compose = (...funcs) => {
    if (!funcs.length) return enhancer({});
    if (funcs.length === 1 && funcs[0] && typeof funcs[0] === 'object') return (...enhancers) => composeWith(funcs[0], enhancers);
    return composeWith({}, funcs);
  };
  const connect = (options) => {
    const name = storeName((options && options.name) || 'Store');
    let last;
    return {
      init: (state) => {
        last = state;
      },
      send: (action, state) => {
        const own = action && typeof action === 'object' && action.type === '${NGRX_PERFORM_ACTION}' && action.action ? action.action : action;
        const before = last;
        last = state;
        if (own === null || own === undefined) return;
        note(name, own);
        if (recording()) record({ store: name, library: 'devtools', type: actionType(own), payload: payloadOf(own), changes: before === undefined ? [] : diffRefs(before, state), duration: null, stack: stackOf() });
      },
      subscribe: () => () => {},
      unsubscribe: () => {},
      error: () => {},
    };
  };
  const ignore = () => {};
  if (!('${REDUX_EXTENSION_GLOBAL}' in window)) {
    const extension = Object.assign((config) => enhancer(config), { connect, disconnect: ignore, send: ignore, listen: ignore, open: ignore, notifyErrors: ignore });
    Object.defineProperty(window, '${REDUX_EXTENSION_GLOBAL}', { configurable: true, writable: true, value: extension });
    Object.defineProperty(window, '${REDUX_COMPOSE_GLOBAL}', { configurable: true, writable: true, value: compose });
  }
`;
