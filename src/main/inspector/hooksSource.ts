import { REACT_HOOK_JS } from './reactHookSource';
import { STORE_HOOK_JS } from './stores/storeHookSource';

/**
 * The framework hooks, put in every new document while **Framework hooks** is on,
 * before the page's own scripts: the store stand-in (`STORE_HOOK_JS`) and the React
 * stand-in (`REACT_HOOK_JS`), each in its own function so that either can step
 * aside for a page's own. They share the last store action, which a React commit
 * right after it names as what led to it.
 */
export const HOOKS_SOURCE = `(() => {
  const lastAction = { store: '', type: '', at: 0 };
  (() => {${STORE_HOOK_JS}})();
  (() => {${REACT_HOOK_JS}})();
})();`;
