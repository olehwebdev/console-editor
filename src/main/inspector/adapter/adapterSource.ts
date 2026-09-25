import { PREVIEW_JS } from './previewSource';
import { REACT_JS } from './reactSource';
import { VUE_JS } from './vueSource';

/**
 * Run on a picked element (`this`) with `Runtime.callFunctionOn`, in its frame's
 * main world. `mode` 'summary' answers by value: the element's label, its
 * framework and the names of the components that rendered it. 'describe'
 * answers `{ data, fns }` by reference: `data` describes the component at
 * `depth` of that chain, and names functions by their index in `fns`, whose
 * places the main process looks up. React is tried first, then Vue.
 */
export const ADAPTER_SOURCE = `function (mode, depth) {
  const MAX_CHAIN = 40;
  const SUMMARY_NAMES = 8;
  ${PREVIEW_JS}
  ${REACT_JS}
  ${VUE_JS}
  const el = this.nodeType === 1 ? this : this.parentElement;
  if (!el) return null;
  const fns = [];
  const fn = (value) => (typeof value === 'function' ? fns.push(value) - 1 : -1);
  const attempt = (find) => {
    try {
      return find(el);
    } catch (err) {
      return null;
    }
  };
  const found = attempt(reactFind) || attempt(vueFind);
  const base = { element: label(el), framework: found ? found.framework : null };
  if (mode === 'summary') return Object.assign(base, { chain: found ? found.names.slice(0, SUMMARY_NAMES) : [] });
  const at = found ? Math.max(0, Math.min(depth, found.size - 1)) : 0;
  const described = found ? found.describe(at, fn) : { chain: [], props: [], state: [], context: [], handlers: [] };
  return { data: Object.assign(base, { build: found ? found.build : null, depth: at }, described), fns };
}`;

/** Read on the adapter's `{ data, fns }` answer: its data by value, then its functions by reference. */
export const DATA_OF_SOURCE = 'function () { return this.data; }';
export const FNS_OF_SOURCE = 'function () { return this.fns; }';
/** The document a node is in: which frame it belongs to is told by the frames' owners. */
export const OWNER_DOCUMENT_SOURCE = 'function () { return this.ownerDocument; }';
