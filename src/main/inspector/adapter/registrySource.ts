import { ANGULAR_REGISTRY_GLOBAL, ANGULAR_VIEW } from '../constants';

/**
 * On an element or document, for a page running a production Angular build (whose components only its view
 * registry leads to): the registry, when it was found before and kept on the window (and still holds views);
 * else null. Undefined for a page that needs none (no Angular, or a development build, with `window.ng`).
 */
export const KEPT_REGISTRY_SOURCE = `function () {
  const ng = window.ng;
  if (!document.querySelector('[ng-version]') || (ng && typeof ng.getComponent === 'function')) return undefined;
  const kept = Object.prototype.hasOwnProperty.call(window, '${ANGULAR_REGISTRY_GLOBAL}') ? window['${ANGULAR_REGISTRY_GLOBAL}'] : null;
  return kept instanceof Map && kept.size ? kept : null;
}`;
/** On the registry found: kept on its page's window (`ANGULAR_REGISTRY_GLOBAL`), not enumerable. */
export const KEEP_REGISTRY_SOURCE = `function () {
  Object.defineProperty(window, '${ANGULAR_REGISTRY_GLOBAL}', { configurable: true, value: this });
}`;
/** On an element or document: the Map prototype of its world, for `Runtime.queryObjects`. */
export const MAP_PROTOTYPE_SOURCE = 'function () { return Map.prototype; }';
/**
 * On the array of every Map in the heap (`Runtime.queryObjects`): Angular's view registry, the Map whose keys
 * are view ids and whose values are the views (arrays) with that id in their id slot and a `TView` object.
 */
export const FIND_REGISTRY_SOURCE = `function () {
  for (const map of this) {
    if (!map.size) continue;
    const [key, view] = map.entries().next().value;
    if (typeof key === 'number' && Array.isArray(view) && view[${ANGULAR_VIEW.id}] === key && view[${ANGULAR_VIEW.tView}] && typeof view[${ANGULAR_VIEW.tView}] === 'object') return map;
  }
  return undefined;
}`;
