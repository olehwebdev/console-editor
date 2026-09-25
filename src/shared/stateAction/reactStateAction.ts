import { HOOK_PLACE, REACT_CLASS_TAG, REACT_MEMO_TAG } from './constants';
import { findElement } from './findElement';
import type { StateActionInput } from './types';

/**
 * React: from the element's fiber up to the component (memo()'s wrapper isn't one), then a `useState`
 * hook's dispatch (hooks are a list, by place), or a class component's `setState`.
 */
export function reactStateAction(input: StateActionInput): string {
  const { depth, edit } = input;
  const set = HOOK_PLACE.test(edit.name)
    ? `let hook = fiber.memoizedState;
for (let place = 1; place < ${edit.name}; place++) hook = hook.next;
hook.queue.dispatch(${edit.json});`
    : `if (fiber.tag !== ${REACT_CLASS_TAG}) throw new Error('That component is no class component any more');
fiber.stateNode.setState({ ${JSON.stringify(edit.name)}: ${edit.json} });`;
  return `${findElement(input)}
const fiberKeyOf = (el) => Object.keys(el).find((key) => key.startsWith('__reactFiber$'));
let host = element;
while (host && !fiberKeyOf(host)) host = host.parentElement;
if (!host) throw new Error('React rendered no element there');
const renderOf = (type) => (typeof type === 'function' ? type : type && typeof type === 'object' ? (typeof type.render === 'function' ? type.render : renderOf(type.type)) : null);
let fiber = host[fiberKeyOf(host)];
for (let above = ${depth}; fiber; fiber = fiber.return) if (fiber.tag !== ${REACT_MEMO_TAG} && renderOf(fiber.type) && above-- === 0) break;
if (!fiber) throw new Error('That component is gone');
${set}`;
}
