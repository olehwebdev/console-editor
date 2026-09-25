/**
 * Page-side state editing for the adapter (`ADAPTER_SOURCE`): which values of a
 * component can be set, and setting one. React: a `useState` hook (its queue
 * reduces with React's own `basicStateReducer`; a `useReducer`'s with the app's
 * reducer, which takes actions, not values) through its dispatch, and a class's
 * state through `setState` (the reducer is told by its text, which a minifier may
 * quote with backticks). Vue: a key of `data`, or a writable ref in
 * `setupState` (read under its unwrapping proxy, whose target it is).
 */
export const EDIT_JS = String.raw`
  const SETTLE_MS = 50;
  const BASIC_REDUCER = /^function\s*[\w$]*\s*\(\s*([\w$]+)\s*,\s*([\w$]+)\s*\)\s*\{\s*return\s*(?:typeof\s+\2\s*={2,3}\s*(["'\x60])function\3|(["'\x60])function\4\s*={2,3}\s*typeof\s+\2)\s*\?\s*\2\s*\(\s*\1\s*\)\s*:\s*\2\s*;?\s*\}$/;
  const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
  const isStateQueue = (queue) => {
    try {
      return BASIC_REDUCER.test(String(queue.lastRenderedReducer).replace(COMMENTS, '').trim());
    } catch (err) {
      return false;
    }
  };
  const reactSet = (fiber, edit) => {
    if (fiber.tag === CLASS_TAG) {
      if (edit.kind !== 'state' || !fiber.stateNode || typeof fiber.stateNode.setState !== 'function') return false;
      fiber.stateNode.setState({ [edit.name]: edit.value });
      return true;
    }
    let hook = /^\d+$/.test(edit.name) ? fiber.memoizedState : null;
    for (let place = 1; hook && place < Number(edit.name); place++) hook = hook.next;
    if (!hook || !hook.queue || typeof hook.queue.dispatch !== 'function' || !isStateQueue(hook.queue)) return false;
    hook.queue.dispatch(edit.value);
    return true;
  };
  const vueRef = (instance, key) => {
    const own = Object.getOwnPropertyDescriptor(instance.setupState || {}, key);
    return own ? own.value : undefined;
  };
  const vueEditable = (instance, kind, key) => {
    if (kind === 'data') return !!instance.data && Object.prototype.hasOwnProperty.call(instance.data, key) && typeof instance.data[key] !== 'function';
    const ref = kind === 'setup' ? vueRef(instance, key) : null;
    return !!ref && ref.__v_isRef === true && !ref.__v_isReadonly;
  };
  const vueSet = (instance, edit) => {
    if (!vueEditable(instance, edit.kind, edit.name)) return false;
    if (edit.kind === 'data') instance.data[edit.name] = edit.value;
    else vueRef(instance, edit.name).value = edit.value;
    return true;
  };
  // A set value shows once the framework rendered it: React and Vue both do that within a task or two.
  const settle = () => new Promise((resolve) => setTimeout(() => resolve(true), SETTLE_MS));
`;
