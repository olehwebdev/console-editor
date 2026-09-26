import { MAX_ROOT_SCAN, MAX_TREE_NODES } from '../constants';

/**
 * Page-side Components tree for the adapter (`ADAPTER_SOURCE`), from the top:
 * React's roots (the hook's, else the containers React marks), Vue's apps, Vue
 * 2's root instances, Angular's root components and top custom elements.
 * A node is addressed by its path of indexes from the top; its children are the
 * nearest components under it. A node leads to its first element, which is how
 * the app opens and highlights it, and a picked component to its path.
 */
export const TREE_JS = `
  // What an element belongs to, trying each framework in turn.
  const findAt = (el) => [reactFind, vueFind, vue2Find, angularFind, elementFind].reduce((hit, find) => hit || attempt(find, el), null);
  const reactRoots = () => {
    const roots = new Set();
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && hook.renderers && typeof hook.getFiberRoots === 'function') {
      for (const id of hook.renderers.keys()) for (const root of hook.getFiberRoots(id)) roots.add(root);
    }
    const elements = roots.size ? [] : document.querySelectorAll('*');
    for (let i = 0; i < elements.length && i < ${MAX_ROOT_SCAN}; i++) {
      const container = elements[i];
      const key = Object.keys(container).find((k) => k.startsWith('__reactContainer$'));
      const legacy = container._reactRootContainer && container._reactRootContainer._internalRoot;
      if (key && container[key] && container[key].stateNode) roots.add(container[key].stateNode);
      else if (legacy) roots.add(legacy);
    }
    return [...roots].filter((root) => root.current);
  };
  const reactKids = (fiber) => {
    const out = [];
    const walk = (parent) => {
      for (let child = parent.child; child; child = child.sibling) {
        if (isComponent(child)) out.push(child);
        else walk(child);
      }
    };
    walk(fiber);
    return out;
  };
  const reactElement = (fiber) => {
    if (fiber.stateNode instanceof Element) return fiber.stateNode;
    for (let child = fiber.child; child; child = child.sibling) {
      const found = reactElement(child);
      if (found) return found;
    }
    return null;
  };
  const vueKids = (instance) => {
    const out = [];
    const visit = (vnode) => {
      if (!vnode || typeof vnode !== 'object') return;
      if (vnode.component) return void out.push(vnode.component);
      if (Array.isArray(vnode.children)) vnode.children.forEach(visit);
      if (vnode.suspense) visit(vnode.suspense.activeBranch);
    };
    visit(instance.subTree);
    return out;
  };
  const vueElement = (vnode) => {
    if (!vnode || typeof vnode !== 'object') return null;
    if (vnode.component) return vueElement(vnode.component.subTree);
    if (vnode.el && vnode.el.nodeType === 1) return vnode.el;
    for (const child of Array.isArray(vnode.children) ? vnode.children : []) {
      const found = vueElement(child);
      if (found) return found;
    }
    return null;
  };
  const TREE = {
    react: {
      top: () => reactRoots().flatMap((root) => reactKids(root.current)),
      kids: reactKids,
      element: reactElement,
      node: (f, fn) => ({ name: componentName(f.type), key: f.key == null ? null : String(f.key), fn: fn(renderFunction(f.type)) }),
      same: (a, b) => a === b || a === b.alternate,
    },
    vue: {
      top: () =>
        Array.from(document.querySelectorAll('[data-v-app]'))
          // A production build sets no app._instance: the root vnode on the container leads to it.
          .map((container) => container.__vue_app__ && container._vnode && container._vnode.component)
          .filter(Boolean),
      kids: vueKids,
      element: (instance) => vueElement(instance.subTree),
      node: (i, fn) => ({ name: vueName(i), key: i.vnode && i.vnode.key != null ? String(i.vnode.key) : null, fn: fn(vueFunction(i)) }),
      same: (a, b) => a === b,
    },
    vue2: VUE2_TREE,
    angular: ANGULAR_TREE,
    element: ELEMENT_TREE,
  };
  const topOf = (framework) => {
    try {
      return TREE[framework].top();
    } catch (err) {
      return [];
    }
  };
  const treeTop = () => Object.keys(TREE).flatMap((framework) => topOf(framework).map((ref) => ({ framework, ref })));
  const treeKids = (entry) => TREE[entry.framework].kids(entry.ref).map((ref) => ({ framework: entry.framework, ref }));
  const treeAt = (path) => {
    let level = treeTop();
    let entry = null;
    for (const index of path) {
      entry = level[index];
      if (!entry) return null;
      level = treeKids(entry);
    }
    return { entry, level };
  };
  const treeLevel = (path, fn) => {
    const at = treeAt(path);
    if (!at) return null;
    const nodes = at.level.slice(0, ${MAX_TREE_NODES}).map((entry) => Object.assign(TREE[entry.framework].node(entry.ref, fn), { framework: entry.framework, children: treeKids(entry).length }));
    return { nodes, more: Math.max(0, at.level.length - ${MAX_TREE_NODES}) };
  };
  const treeLocate = (path) => {
    const at = path.length ? treeAt(path) : null;
    const element = at && TREE[at.entry.framework].element(at.entry.ref);
    const found = element && findAt(element);
    const depth = found ? found.refs.findIndex((ref) => TREE[at.entry.framework].same(ref, at.entry.ref)) : -1;
    return depth < 0 ? null : { element, depth };
  };
  const treePath = (found, depth) => {
    const same = TREE[found.framework].same;
    const path = [];
    for (let i = depth; i < found.refs.length - 1; i++) {
      const index = TREE[found.framework].kids(found.refs[i + 1]).findIndex((ref) => same(ref, found.refs[i]));
      if (index < 0) return null;
      path.unshift(index);
    }
    const top = treeTop().findIndex((entry) => entry.framework === found.framework && same(entry.ref, found.refs[found.refs.length - 1]));
    return top < 0 ? null : [top, ...path];
  };
`;
