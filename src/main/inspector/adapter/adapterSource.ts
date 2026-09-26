import { ANGULAR_JS } from './angularSource';
import { DOM_JS } from './domSource';
import { EDIT_JS } from './editSource';
import { ELEMENT_JS } from './elementSource';
import { PREVIEW_JS } from './previewSource';
import { REACT_CURRENT_JS } from './reactCurrentSource';
import { REACT_JS } from './reactSource';
import { TREE_JS } from './treeSource';
import { VUE2_JS } from './vue2Source';
import { VUE_JS } from './vueSource';

/**
 * The adapter, run in a frame's main world with `Runtime.callFunctionOn` on an
 * element (`this`), or on its document for the tree's modes. By `mode`:
 * - 'summary' answers by value: the element's label, its framework and the
 *   names of the components that rendered it;
 * - 'describe' answers `{ data, fns }` by reference: `data` describes the
 *   component at depth `arg` of that chain (and its path in the tree), naming
 *   functions by their index in `fns`, whose places the main process looks up;
 * - 'set' sets a value of that component's state (`edit`: its kind, name and
 *   new value), then waits for it to render; false if it can't be set;
 * - 'tree' answers `{ data, fns }`: the components under the tree node at path
 *   `arg` (the top ones for an empty path), and how many children each has;
 * - 'locate' answers `{ element, depth }` for the node at path `arg`: its first
 *   element, and where the component is in that element's chain.
 * React is tried first, then Vue 3, Vue 2, Angular and custom elements.
 * `registry`: Angular's view registry, for a production build (main finds it).
 */
export const ADAPTER_SOURCE = `function (mode, arg, edit, registry) {
  const MAX_CHAIN = 40;
  const SUMMARY_NAMES = 8;
  const ngRegistry = registry || null;
  ${PREVIEW_JS}
  ${DOM_JS}
  ${EDIT_JS}
  ${REACT_CURRENT_JS}
  ${REACT_JS}
  ${VUE_JS}
  ${VUE2_JS}
  ${ANGULAR_JS}
  ${ELEMENT_JS}
  ${TREE_JS}
  const fns = [];
  const fn = (value) => (typeof value === 'function' ? fns.push(value) - 1 : -1);
  const attempt = (find, el) => {
    try {
      return find(el);
    } catch (err) {
      return null;
    }
  };
  const el = this.nodeType === 1 ? this : this.parentElement;
  const found = el && findAt(el);
  const at = found ? Math.max(0, Math.min(arg, found.size - 1)) : 0;
  const base = () => ({ element: label(el), framework: found ? found.framework : null });
  const nothing = { chain: [], props: [], state: [], context: [], handlers: [] };
  const MODES = {
    summary: () => el && Object.assign(base(), { chain: found ? found.names.slice(0, SUMMARY_NAMES) : [] }),
    describe: () =>
      el && { data: Object.assign(base(), { build: found ? found.build : null, depth: at, path: found ? treePath(found, at) : null, selector: selectorOf(el) }, found ? found.describe(at, fn) : nothing), fns },
    set: () => !!found && found.set(at, edit) && settle(),
    tree: () => ({ data: treeLevel(arg, fn), fns }),
    locate: () => treeLocate(arg),
  };
  return MODES[mode] ? MODES[mode]() : null;
}`;

/** Read on the adapter's `{ data, fns }` answer: its data by value, then its functions by reference. */
export const DATA_OF_SOURCE = 'function () { return this.data; }';
export const FNS_OF_SOURCE = 'function () { return this.fns; }';
/** The document a node is in: which frame it belongs to is told by the frames' owners. */
export const OWNER_DOCUMENT_SOURCE = 'function () { return this.ownerDocument; }';
/** The element of the adapter's `locate` answer. */
export const ELEMENT_OF_SOURCE = 'function () { return this.element; }';
