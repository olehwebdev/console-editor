import { MAX_ROOT_SCAN } from '../constants';

/**
 * Page-side Vue 2 part of the adapter (`ADAPTER_SOURCE`). A component's root
 * element carries its instance (`__vue__`); components sharing a root element
 * leave the outermost's there, so the innermost is found down its root vnode.
 * Up through `$parent`; down through `$children`; roots are the instances with
 * no parent. A development build renders through a Proxy.
 */
export const VUE2_JS = `
  const vue2Owner = (node) => {
    let vm = node.__vue__;
    while (vm && vm._vnode && vm._vnode.componentInstance && vm._vnode.componentInstance.$el === node) vm = vm._vnode.componentInstance;
    return vm;
  };
  const vue2Name = (vm) => (vm.$options && (vm.$options.name || vm.$options._componentTag)) || 'Anonymous';
  // Where its code is: its render function, else its first method.
  const vue2Function = (vm) => {
    const options = vm.$options || {};
    return options.render || Object.values(options.methods || {})[0] || null;
  };
  const vue2Key = (vm) => (vm.$vnode && vm.$vnode.key != null ? String(vm.$vnode.key) : null);
  const vue2Set = (vm, edit) => {
    const data = edit.kind === 'data' ? vm._data : null;
    if (!data || !Object.prototype.hasOwnProperty.call(data, edit.name) || typeof data[edit.name] === 'function') return false;
    vm[edit.name] = edit.value;
    return true;
  };
  const vue2Find = (el) => {
    let node = el;
    while (node && !node.__vue__) node = node.parentElement;
    if (!node) return null;
    const chain = [];
    for (let vm = vue2Owner(node); vm && chain.length < MAX_CHAIN; vm = vm.$parent) chain.push(vm);
    return {
      framework: 'vue2',
      build: chain[0]._renderProxy !== chain[0] ? 'development' : 'production',
      names: chain.map(vue2Name),
      size: chain.length,
      refs: chain,
      set: (depth, edit) => vue2Set(chain[depth], edit),
      describe: (depth, fn) => {
        const vm = chain[depth];
        // A component that provides gets provides of its own; the others share their parent's.
        const provided = vm._provided && (!vm.$parent || vm._provided !== vm.$parent._provided) ? vm._provided : null;
        return {
          chain: chain.map((c) => ({ name: vue2Name(c), key: vue2Key(c), fn: fn(vue2Function(c)) })),
          props: entries(vm._props, fn),
          state: entries(vm._data, fn).map((e) => Object.assign(e, { kind: 'data', editable: typeof vm._data[e.name] !== 'function' })),
          context: provided ? Object.keys(provided).slice(0, MAX_ITEMS).map((name) => ({ name, preview: preview(provided[name]), provider: vue2Name(vm), fn: fn(vue2Function(vm)) })) : [],
          handlers: [],
        };
      },
    };
  };
  const VUE2_TREE = {
    top: () => {
      const roots = new Set();
      const elements = document.querySelectorAll('*');
      for (let i = 0; i < elements.length && i < ${MAX_ROOT_SCAN}; i++) {
        const vm = elements[i].__vue__;
        if (vm && !vm.$parent) roots.add(vm);
      }
      return [...roots];
    },
    kids: (vm) => vm.$children.slice(),
    element: (vm) => (vm.$el && vm.$el.nodeType === 1 ? vm.$el : null),
    node: (vm, fn) => ({ name: vue2Name(vm), key: vue2Key(vm), fn: fn(vue2Function(vm)) }),
    same: (a, b) => a === b,
  };
`;
