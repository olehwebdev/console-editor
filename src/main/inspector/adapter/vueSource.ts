/**
 * Page-side Vue 3 part of the adapter (`ADAPTER_SOURCE`). Development builds put
 * the component on each element (`__vueParentComponent`); production builds
 * don't, so the app's vnode tree is walked from the element it is mounted on
 * (`_vnode`), as probed on Vue 3.5 (docs/INSPECTOR_RESEARCH.md §2): only down
 * the elements that hold the one looked for (an element's vnode holds its
 * subtree), so a large app costs its depth, not its size.
 */
export const VUE_JS = `
  const MAX_VNODES = 20000;
  const vueName = (instance) => {
    const type = instance.type || {};
    return type.name || type.__name || type.displayName || 'Anonymous';
  };
  const vueFunction = (instance) => {
    const type = instance.type || {};
    return typeof type === 'function' ? type : type.setup || type.render || null;
  };
  const vueOwner = (el) => {
    for (let node = el; node; node = node.parentElement) {
      if (node.__vueParentComponent) return { instance: node.__vueParentComponent, vnode: el.__vnode || node.__vnode || null, build: 'development' };
    }
    let container = el;
    while (container && !container._vnode) container = container.parentElement;
    if (!container) return null;
    // The deepest element holding it that a component rendered: the element itself, else its nearest such ancestor.
    let hit = null;
    let visited = 0;
    const visit = (vnode, owner) => {
      if (!vnode || typeof vnode !== 'object' || visited++ > MAX_VNODES) return;
      if (vnode.component) return visit(vnode.component.subTree, vnode.component);
      // An element's vnode (a string type) holds its subtree; a fragment's or a teleport's doesn't.
      if (typeof vnode.type === 'string' && vnode.el && vnode.el.nodeType === 1) {
        if (!vnode.el.contains(el)) return;
        if (owner) hit = { instance: owner, vnode };
      }
      if (Array.isArray(vnode.children)) vnode.children.forEach((child) => visit(child, owner));
      if (vnode.suspense) visit(vnode.suspense.activeBranch, owner);
    };
    visit(container._vnode, null);
    return hit && { instance: hit.instance, vnode: hit.vnode, build: 'production' };
  };
  const vueFind = (el) => {
    const found = vueOwner(el);
    if (!found) return null;
    const chain = [];
    for (let instance = found.instance; instance && chain.length < MAX_CHAIN; instance = instance.parent) chain.push(instance);
    return {
      framework: 'vue',
      build: found.build,
      names: chain.map(vueName),
      size: chain.length,
      refs: chain,
      set: (depth, edit) => vueSet(chain[depth], edit),
      describe: (depth, fn) => {
        const instance = chain[depth];
        const tagged = (kind) => (e) => Object.assign(e, { kind, editable: vueEditable(instance, kind, e.name) });
        // A component that provides gets provides of its own; the others share their parent's.
        const provides = instance.provides && (!instance.parent || instance.provides !== instance.parent.provides) ? instance.provides : null;
        return {
          chain: chain.map((i) => ({ name: vueName(i), key: i.vnode && i.vnode.key != null ? String(i.vnode.key) : null, fn: fn(vueFunction(i)) })),
          props: entries(instance.props, fn),
          state: entries(instance.setupState, fn).map(tagged('setup')).concat(entries(instance.data, fn).map(tagged('data'))),
          context: provides
            ? Reflect.ownKeys(provides).slice(0, MAX_ITEMS).map((key) => ({ name: String(key), preview: preview(provides[key]), provider: vueName(instance), fn: fn(vueFunction(instance)) }))
            : [],
          handlers: listeners(found.vnode && found.vnode.props, fn),
        };
      },
    };
  };
`;
