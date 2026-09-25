import { ANGULAR_VIEW } from '../constants';

/** On an element or document: whether its page runs a production Angular build, whose components only its view registry leads to. */
export const NEEDS_REGISTRY_SOURCE = `function () {
  const ng = window.ng;
  return !!document.querySelector('[ng-version]') && !(ng && typeof ng.getComponent === 'function');
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
