/**
 * Put in every new document while **Framework hooks** is on, before the page's
 * own scripts: a minimal stand-in for the React DevTools hook. React, production
 * builds too, hands its renderer (with its version and build) to a hook it finds
 * as it loads, and nothing else says which React a frame runs. Commits are
 * ignored for now. A page that already has a hook (the extension's, React
 * Refresh's) keeps it; the stand-in has the members React and React Refresh use.
 */
export const REACT_HOOK_SOURCE = `(() => {
  if ('__REACT_DEVTOOLS_GLOBAL_HOOK__' in window) return;
  const renderers = new Map();
  const ignore = () => {};
  const hook = {
    renderers,
    supportsFiber: true,
    inject(renderer) {
      const id = renderers.size + 1;
      renderers.set(id, renderer);
      return id;
    },
    checkDCE: ignore,
    onCommitFiberRoot: ignore,
    onCommitFiberUnmount: ignore,
    onPostCommitFiberRoot: ignore,
  };
  Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', { configurable: true, enumerable: false, writable: true, value: hook });
})();`;
