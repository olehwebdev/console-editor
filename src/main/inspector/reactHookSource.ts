import { RENDERED_TYPES } from './constants';
import { RENDER_SUMMARY_JS } from './renderSummarySource';

/**
 * Put in every new document while **Framework hooks** is on, before the page's
 * own scripts: a minimal stand-in for the React DevTools hook. React, production
 * builds too, hands its renderer (with its version and build) to a hook it finds
 * as it loads, and nothing else says which React a frame runs. Each commit tells
 * it the root committed, which it keeps (`getFiberRoots`, as the extension's
 * hook has) for the Components tree, and, while renders are recorded, sums up
 * (`RENDER_SUMMARY_JS`). A page that already has a hook (the
 * extension's, React Refresh's) keeps it; the stand-in has the members React and
 * React Refresh use.
 */
export const REACT_HOOK_SOURCE = `(() => {
  if ('__REACT_DEVTOOLS_GLOBAL_HOOK__' in window) return;
  ${RENDER_SUMMARY_JS}
  const renderers = new Map();
  const roots = new Map();
  const ignore = () => {};
  const hook = {
    renderers,
    supportsFiber: true,
    getFiberRoots(id) {
      if (!roots.has(id)) roots.set(id, new Set());
      return roots.get(id);
    },
    inject(renderer) {
      const id = renderers.size + 1;
      renderers.set(id, renderer);
      return id;
    },
    checkDCE: ignore,
    onCommitFiberRoot(id, root) {
      try {
        const state = root.current && root.current.memoizedState;
        // An unmounted root commits once more, with nothing in it.
        if (state && state.element != null) hook.getFiberRoots(id).add(root);
        else hook.getFiberRoots(id).delete(root);
        record(root);
      } catch (err) {
        // Never in React's way.
      }
    },
    onCommitFiberUnmount: ignore,
    onPostCommitFiberRoot: ignore,
  };
  Object.defineProperty(hook, '${RENDERED_TYPES}', { value: renderedTypes });
  Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', { configurable: true, enumerable: false, writable: true, value: hook });
})();`;
