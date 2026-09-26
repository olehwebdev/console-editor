import { findElement } from './findElement';
import { member } from './member';
import type { StateActionInput } from './types';

/**
 * Vue 2: the instance on the element (components sharing a root element leave the outermost's there, so
 * the innermost is found down its root vnode), up its `$parent`s, then a key of its data.
 */
export function vue2StateAction(input: StateActionInput): string {
  const { depth, edit } = input;
  return `${findElement(input)}
let node = element;
while (node && !node.__vue__) node = node.parentElement;
let vm = node && node.__vue__;
while (vm && vm._vnode && vm._vnode.componentInstance && vm._vnode.componentInstance.$el === node) vm = vm._vnode.componentInstance;
for (let up = 0; vm && up < ${depth}; up++) vm = vm.$parent;
if (!vm) throw new Error('That component is gone');
vm${member(edit.name)} = ${edit.json};`;
}
