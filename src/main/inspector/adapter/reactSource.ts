/**
 * Page-side React part of the adapter (`ADAPTER_SOURCE`): from an element to the
 * components that rendered it (its fiber's `return` chain), and what one of them
 * holds. Probed on React 19 builds, production included (docs/INSPECTOR_RESEARCH.md §2).
 */
export const REACT_JS = `
  const MEMO_TAG = 14;
  const CLASS_TAG = 1;
  const reactKey = (el, prefixes) => Object.keys(el).find((key) => prefixes.some((prefix) => key.startsWith(prefix)));
  const renderFunction = (type) => {
    if (typeof type === 'function') return type;
    if (type && typeof type === 'object') return typeof type.render === 'function' ? type.render : renderFunction(type.type);
    return null;
  };
  const componentName = (type) => {
    const render = renderFunction(type);
    return (type && type.displayName) || (render && (render.displayName || render.name)) || 'Anonymous';
  };
  // A memo() fiber's child is the component itself.
  const isComponent = (fiber) => fiber.tag !== MEMO_TAG && renderFunction(fiber.type) !== null;
  const hookKind = (hook) => {
    const state = hook.memoizedState;
    const queue = hook.queue;
    if (queue && typeof queue.getSnapshot === 'function') return 'store';
    if (queue && typeof queue.dispatch === 'function') return isStateQueue(queue) ? 'state' : 'reducer';
    if (state && typeof state === 'object' && typeof state.create === 'function' && 'deps' in state) return 'effect';
    if (state && typeof state === 'object' && !Array.isArray(state) && Object.keys(state).length === 1 && 'current' in state) return 'ref';
    if (Array.isArray(state) && state.length === 2 && (state[1] === null || Array.isArray(state[1]))) return 'memo';
    return 'other';
  };
  const HOOK_VALUE = { store: (s) => s, state: (s) => s, reducer: (s) => s, ref: (s) => s.current, memo: (s) => s[0], other: (s) => s };
  const hooks = (fiber, fn) => {
    const out = [];
    let index = 0;
    for (let hook = fiber.memoizedState; hook && out.length < MAX_ITEMS; hook = hook.next) {
      index += 1;
      const kind = hookKind(hook);
      if (kind === 'effect') continue;
      const value = HOOK_VALUE[kind](hook.memoizedState);
      out.push({ name: String(index), kind, preview: preview(value), fn: fn(value), editable: kind === 'state' });
    }
    return out;
  };
  const contexts = (fiber, fn) => {
    const out = [];
    for (let dep = fiber.dependencies && fiber.dependencies.firstContext; dep && out.length < MAX_ITEMS; dep = dep.next) {
      const context = dep.context;
      let provider = up(fiber);
      while (provider && provider.type !== context && !(provider.type && provider.type._context === context)) provider = up(provider);
      let owner = provider && up(provider);
      while (owner && !isComponent(owner)) owner = up(owner);
      out.push({
        name: context.displayName || 'Context',
        // Once rendering is done the context holds its default again: the provider holds the value.
        preview: preview(provider ? provider.memoizedProps.value : context._currentValue),
        provider: owner ? componentName(owner.type) : null,
        fn: owner ? fn(renderFunction(owner.type)) : -1,
      });
    }
    return out;
  };
  const reactFind = (el) => {
    let node = el;
    let key;
    while (node && !(key = reactKey(node, ['__reactFiber$', '__reactInternalInstance$']))) node = node.parentElement;
    if (!key) return null;
    // The element's key keeps the fiber it was created with: the copy on screen may be the other.
    const fiber = currentFiber(node[key]);
    const chain = [];
    for (let f = fiber; f && chain.length < MAX_CHAIN; f = up(f)) if (isComponent(f)) chain.push(f);
    if (!chain.length) return null;
    const propsKey = reactKey(node, ['__reactProps$', '__reactEventHandlers$']);
    return {
      framework: 'react',
      // Fibers carry _debugOwner in development builds only.
      build: '_debugOwner' in fiber ? 'development' : 'production',
      names: chain.map((f) => componentName(f.type)),
      size: chain.length,
      refs: chain,
      set: (depth, edit) => reactSet(chain[depth], edit),
      describe: (depth, fn) => {
        const f = chain[depth];
        return {
          chain: chain.map((c) => ({ name: componentName(c.type), key: c.key == null ? null : String(c.key), fn: fn(renderFunction(c.type)) })),
          props: entries(f.memoizedProps, fn),
          state: f.tag === CLASS_TAG ? entries(f.memoizedState, fn).map((e) => Object.assign(e, { kind: 'state', editable: !!f.stateNode })) : hooks(f, fn),
          context: contexts(f, fn),
          handlers: listeners(propsKey ? node[propsKey] : null, fn),
        };
      },
    };
  };
`;
