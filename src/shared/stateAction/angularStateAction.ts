import { findElement } from './findElement';
import { member } from './member';
import type { StateActionInput } from './types';

/**
 * Angular, development builds (`window.ng`): the component hosts from the element up (out of shadow roots
 * too), then a signal of the instance, set through its own `set`. A production build has no `ng`.
 */
export function angularStateAction(input: StateActionInput): string {
  const { depth, edit } = input;
  return `${findElement(input)}
if (!window.ng || typeof ng.getComponent !== 'function') throw new Error("This page runs Angular's production build: it has no ng to reach components through");
const componentOf = (node) => {
  try {
    return ng.getComponent(node);
  } catch (err) {
    return null;
  }
};
const hosts = [];
for (let node = element; node; node = node.parentElement || (node.parentNode && node.parentNode.host) || null) if (componentOf(node)) hosts.push(node);
if (!hosts[${depth}]) throw new Error('That component is gone');
componentOf(hosts[${depth}])${member(edit.name)}.set(${edit.json});`;
}
