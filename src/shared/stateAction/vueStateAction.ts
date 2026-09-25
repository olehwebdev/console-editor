import { findElement } from './findElement';
import { member } from './member';
import type { StateActionInput } from './types';

/**
 * Vue 3: the component that rendered the element (a development build tags elements with it; a
 * production build's is found down the app's vnode tree from the element it is mounted on), up its
 * parents, then a value of its `setupState` (a ref: the proxy sets its value) or its `data`.
 */
export function vueStateAction(input: StateActionInput): string {
  const { depth, edit } = input;
  const store = edit.kind === 'data' ? 'data' : 'setupState';
  return `${findElement(input)}
const ownerOf = (el) => {
  for (let node = el; node; node = node.parentElement) if (node.__vueParentComponent) return node.__vueParentComponent;
  let container = el;
  while (container && !container._vnode) container = container.parentElement;
  const owners = new Map();
  const visit = (vnode, owner) => {
    if (!vnode || typeof vnode !== 'object') return;
    if (vnode.component) return visit(vnode.component.subTree, vnode.component);
    if (vnode.el && !owners.has(vnode.el)) owners.set(vnode.el, owner);
    if (Array.isArray(vnode.children)) vnode.children.forEach((child) => visit(child, owner));
    if (vnode.suspense) visit(vnode.suspense.activeBranch, owner);
  };
  if (container) visit(container._vnode, null);
  for (let node = el; node; node = node.parentElement) if (owners.get(node)) return owners.get(node);
  return null;
};
let instance = ownerOf(element);
for (let up = 0; instance && up < ${depth}; up++) instance = instance.parent;
if (!instance) throw new Error('That component is gone');
instance.${store}${member(edit.name)} = ${edit.json};`;
}
