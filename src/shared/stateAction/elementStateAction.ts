import { findElement } from './findElement';
import { member } from './member';
import type { StateActionInput } from './types';

/** Web components: the custom elements from the element up (out of shadow roots too), then a property of the host. */
export function elementStateAction(input: StateActionInput): string {
  const { depth, edit } = input;
  return `${findElement(input)}
const hosts = [];
for (let node = element; node; node = node.parentElement || (node.parentNode && node.parentNode.host) || null) if (node.localName.includes('-') && customElements.get(node.localName)) hosts.push(node);
if (!hosts[${depth}]) throw new Error('That component is gone');
hosts[${depth}]${member(edit.name)} = ${edit.json};`;
}
