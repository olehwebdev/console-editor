/**
 * Called with the handlers `DOMDebugger.getEventListeners` gave for an element: the function each runs, for
 * its name and place. Vue 3 keeps the real one in its invoker's `value`; an object listener runs its
 * `handleEvent`. Answers `{ data, fns }`, as the adapter does.
 */
export const LISTENERS_SOURCE = `function (...handlers) {
  const fns = [];
  const data = handlers.map((handler) => {
    const fn = handler && typeof handler.value === 'function' ? handler.value : typeof handler === 'function' ? handler : handler && typeof handler.handleEvent === 'function' ? handler.handleEvent : null;
    return { name: fn ? fn.name || 'anonymous' : '', fn: fn ? fns.push(fn) - 1 : -1 };
  });
  return { data, fns };
}`;
