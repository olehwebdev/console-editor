import { ANGULAR_VIEW } from '../constants';

/**
 * Page-side Angular part of the adapter (`ADAPTER_SOURCE`). A component is an
 * element (its host). A development build publishes `window.ng`, whose
 * `getComponent` gives a host's instance; a production build doesn't, so the
 * instance is read from Angular's private view registry (`ngRegistry`, found by
 * the main process): the host's `__ngContext__` is the id of the view that
 * declares it, which holds the host's own component view, whose context is the
 * instance (`ANGULAR_VIEW`). Without the registry (while hovering), hosts are
 * told by their tags. Signals are read and set through their own functions.
 */
export const ANGULAR_JS = `
  const ngApi = () => (window.ng && typeof window.ng.getComponent === 'function' ? window.ng : null);
  const isSignal = (value) => typeof value === 'function' && Object.getOwnPropertySymbols(value).some((symbol) => symbol.description === 'SIGNAL');
  const ngComponent = (el) => {
    const api = ngApi();
    if (api) {
      try {
        return api.getComponent(el) || null;
      } catch (err) {
        return null;
      }
    }
    const context = ngRegistry && el.__ngContext__;
    const declaring = typeof context === 'number' ? ngRegistry.get(context) : Array.isArray(context) ? context : null;
    const view = Array.isArray(declaring) ? declaring.find((slot) => Array.isArray(slot) && slot[0] === el) : null;
    const tView = view && view[${ANGULAR_VIEW.tView}];
    return tView && tView.type === ${ANGULAR_VIEW.componentType} ? view[${ANGULAR_VIEW.context}] || null : null;
  };
  // Without a way to the instances, a host is told by what Angular leaves on it and its custom-element-like tag.
  const ngGuess = (el) => !ngApi() && !ngRegistry && el.__ngContext__ !== undefined && el.localName.includes('-');
  const ngName = (host, instance) => (instance ? instance.constructor.name : host.localName);
  const ngRead = (value) => (isSignal(value) ? value() : value);
  const ngDescribe = (hosts, instances, depth, fn) => {
    const instance = instances[depth];
    const chain = hosts.map((host, i) => ({ name: ngName(host, instances[i]), key: null, fn: fn(instances[i] && instances[i].constructor) }));
    if (!instance) return { chain, props: [], state: [], context: [], handlers: [] };
    const inputs = (instance.constructor.ɵcmp && instance.constructor.ɵcmp.inputs) || {};
    // By public name: the class property it sets, first.
    const property = (name) => (Array.isArray(inputs[name]) ? inputs[name][0] : typeof inputs[name] === 'string' ? inputs[name] : name);
    const set = new Set(Object.keys(inputs).map(property));
    return {
      chain,
      props: Object.keys(inputs).slice(0, MAX_ITEMS).map((name) => ({ name, preview: preview(ngRead(instance[property(name)])), fn: -1 })),
      state: Object.keys(instance)
        // Angular tags the instance too (__ngContext__): its own keys aren't the component's.
        .filter((key) => !set.has(key) && !key.startsWith('__ng') && (typeof instance[key] !== 'function' || isSignal(instance[key])))
        .slice(0, MAX_ITEMS)
        .map((name) => {
          const value = instance[name];
          const signal = isSignal(value);
          return { name, kind: signal ? 'signal' : 'field', preview: preview(ngRead(value)), fn: -1, editable: signal && typeof value.set === 'function' };
        }),
      context: [],
      handlers: [],
    };
  };
  const ngSet = (instance, edit) => {
    const signal = instance && edit.kind === 'signal' ? instance[edit.name] : null;
    if (!isSignal(signal) || typeof signal.set !== 'function') return false;
    signal.set(edit.value);
    return true;
  };
  const angularFind = (el) => {
    if (!document.querySelector('[ng-version]')) return null;
    const hosts = [];
    for (let node = el; node && hosts.length < MAX_CHAIN; node = outOf(node)) if (ngComponent(node) || ngGuess(node)) hosts.push(node);
    if (!hosts.length) return null;
    const instances = hosts.map(ngComponent);
    return {
      framework: 'angular',
      build: ngApi() ? 'development' : 'production',
      names: hosts.map((host, i) => ngName(host, instances[i])),
      size: hosts.length,
      refs: hosts,
      set: (depth, edit) => ngSet(instances[depth], edit),
      describe: (depth, fn) => ngDescribe(hosts, instances, depth, fn),
    };
  };
  const ANGULAR_TREE = {
    top: () => Array.from(document.querySelectorAll('[ng-version]')).filter(ngComponent),
    kids: (host) => hostKids(host, (node) => !!ngComponent(node)),
    element: (host) => host,
    node: (host, fn) => {
      const instance = ngComponent(host);
      return { name: ngName(host, instance), key: null, fn: fn(instance && instance.constructor) };
    },
    same: (a, b) => a === b,
  };
`;
