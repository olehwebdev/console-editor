import { MAX_ROOT_SCAN } from '../constants';

/**
 * Page-side, in the Components tree (`TREE_JS`): React's part. Its top is the roots' components (the hook's
 * roots, else the containers React marks, the first `MAX_ROOT_SCAN` elements looked through); a node's
 * children are the nearest component fibers under it, and it leads to its first element.
 */
export const REACT_TREE_JS = `
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
  const REACT_TREE = {
    top: () => reactRoots().flatMap((root) => reactKids(root.current)),
    kids: reactKids,
    element: reactElement,
    node: (f, fn) => ({ name: componentName(f.type), key: f.key == null ? null : String(f.key), fn: fn(renderFunction(f.type)) }),
    same: (a, b) => a === b || a === b.alternate,
  };
`;
