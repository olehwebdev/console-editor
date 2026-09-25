import { MAX_CHANGES, MAX_COMMIT_BATCH, MAX_RENDERED, RENDERS_BINDING, RENDERS_FLUSH_MS } from './constants';

/**
 * Page-side, inside the React hook stand-in (`REACT_HOOK_SOURCE`): what a commit
 * did, while renders are recorded (the binding is there). From the root down,
 * each component fiber is compared with its other copy: mounted (no copy),
 * rendered (React flagged it PerformedWork) and why (props, hook or class state,
 * a store's snapshot, a context's value, else its parent), or skipped although
 * its parent rendered (memo, or the same props). A subtree whose children are
 * the same fibers as before took no part and isn't walked. Summaries are handed
 * over every `RENDERS_FLUSH_MS`; component functions go by id (`RENDERED_TYPES`).
 * Probed on React 19, production and development builds.
 */
export const RENDER_SUMMARY_JS = `
  const PERFORMED_WORK = 1;
  const MEMO_TAG = 14;
  const SIMPLE_MEMO_TAG = 15;
  const CLASS_TAG = 1;
  const typeIds = new Map();
  const typeList = [];
  let pending = [];
  let timer = 0;
  const renderFunction = (type) => {
    if (typeof type === 'function') return type;
    if (type && typeof type === 'object') return typeof type.render === 'function' ? type.render : renderFunction(type.type);
    return null;
  };
  const nameOf = (type) => {
    const render = renderFunction(type);
    return (type && type.displayName) || (render && (render.displayName || render.name)) || 'Anonymous';
  };
  const isComponent = (f) => f.tag !== MEMO_TAG && renderFunction(f.type) !== null;
  const typeId = (type) => {
    const fn = renderFunction(type);
    if (!typeIds.has(fn)) typeIds.set(fn, typeList.push(fn) - 1);
    return typeIds.get(fn);
  };
  const short = (v) => {
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'string') return JSON.stringify(v.length > 40 ? v.slice(0, 40) + '…' : v);
    if (t === 'function') return 'ƒ ' + (v.name || '');
    if (t !== 'object') return String(v);
    if (Array.isArray(v)) return 'Array(' + v.length + ')';
    if (v.$$typeof) return '<' + (typeof v.type === 'string' ? v.type : nameOf(v.type)) + '>';
    const keys = Object.keys(v);
    return '{' + keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', …' : '') + '}';
  };
  const change = (name, from, to) => ({ name, from: short(from), to: short(to) });
  const didWork = (f) => {
    const prev = f.alternate;
    if (!prev) return true;
    if (isComponent(f) || f.tag === MEMO_TAG) return (f.flags & PERFORMED_WORK) !== 0;
    return f.memoizedProps !== prev.memoizedProps || f.memoizedState !== prev.memoizedState;
  };
  const stateReasons = (f, prev) => {
    if (f.tag === CLASS_TAG) {
      const now = f.memoizedState || {};
      const was = prev.memoizedState || {};
      const changes = Object.keys(Object.assign({}, was, now)).filter((k) => now[k] !== was[k]).map((k) => change(k, was[k], now[k]));
      return changes.length ? [{ kind: 'state', changes }] : [];
    }
    const state = [];
    const store = [];
    let index = 0;
    for (let hook = f.memoizedState, old = prev.memoizedState; hook && old; hook = hook.next, old = old.next) {
      index += 1;
      const queue = hook.queue;
      if (!queue || hook.memoizedState === old.memoizedState) continue;
      if (typeof queue.getSnapshot === 'function') store.push(change(String(index), old.memoizedState, hook.memoizedState));
      else if (typeof queue.dispatch === 'function') state.push(change(String(index), old.memoizedState, hook.memoizedState));
    }
    return [state.length && { kind: 'state', changes: state }, store.length && { kind: 'store', changes: store }].filter(Boolean);
  };
  const reasons = (f, prev, parentWorked) => {
    const now = f.memoizedProps || {};
    const was = prev.memoizedProps || {};
    const props = [...new Set([...Object.keys(was), ...Object.keys(now)])].filter((k) => now[k] !== was[k]).map((k) => change(k, was[k], now[k]));
    const read = new Map();
    for (let d = prev.dependencies && prev.dependencies.firstContext; d; d = d.next) read.set(d.context, d.memoizedValue);
    const contexts = [];
    for (let d = f.dependencies && f.dependencies.firstContext; d; d = d.next) {
      if (read.has(d.context) && read.get(d.context) !== d.memoizedValue) contexts.push(change(d.context.displayName || 'Context', read.get(d.context), d.memoizedValue));
    }
    const out = [props.length && { kind: 'props', changes: props }, ...stateReasons(f, prev), contexts.length && { kind: 'context', changes: contexts }].filter(Boolean);
    out.forEach((reason) => (reason.changes = reason.changes.slice(0, ${MAX_CHANGES})));
    return out.length ? out : [{ kind: parentWorked ? 'parent' : 'update', changes: [] }];
  };
  const targetOf = (event) => {
    const target = event.target;
    if (target === window) return 'window';
    return target && target.nodeType === 1 ? target.tagName.toLowerCase() + (target.id ? '#' + target.id : '') : null;
  };
  // The event being handled as React commits; the scheduler's own messages (on a MessagePort) don't count.
  const triggerOf = (event) => (event && (event.target === window || (event.target && event.target.nodeType)) ? { type: event.type, target: targetOf(event) } : null);
  const summarize = (root) => {
    const components = [];
    let more = 0;
    const add = (f, kind, extra) =>
      components.length < ${MAX_RENDERED}
        ? components.push(Object.assign({ name: nameOf(f.type), key: f.key == null ? null : String(f.key), type: typeId(f.type), kind, memo: false, reasons: [] }, extra))
        : (more += 1);
    const visit = (f, parentWorked) => {
      const prev = f.alternate;
      const worked = didWork(f);
      if (!prev && isComponent(f)) add(f, 'mount');
      else if (prev && isComponent(f) && worked) add(f, 'render', { reasons: reasons(f, prev, parentWorked) });
      else if (prev && (isComponent(f) || f.tag === MEMO_TAG) && !worked && parentWorked) add(f, 'skip', { memo: f.tag === MEMO_TAG || f.tag === SIMPLE_MEMO_TAG });
      if (prev && f.child === prev.child) return;
      for (let child = f.child; child; child = child.sibling) visit(child, worked);
    };
    visit(root.current, false);
    return {
      at: performance.timeOrigin + performance.now(),
      duration: typeof root.current.actualDuration === 'number' ? root.current.actualDuration : null,
      trigger: triggerOf(window.event),
      components,
      more,
    };
  };
  const flush = () => {
    timer = 0;
    const batch = pending;
    pending = [];
    if (typeof window.${RENDERS_BINDING} === 'function') window.${RENDERS_BINDING}(JSON.stringify(batch));
  };
  const record = (root) => {
    if (typeof window.${RENDERS_BINDING} !== 'function') return;
    if (pending.length < ${MAX_COMMIT_BATCH}) pending.push(summarize(root));
    if (!timer) timer = setTimeout(flush, ${RENDERS_FLUSH_MS});
  };
  const renderedTypes = (ids) => ids.map((id) => typeList[id]);
`;
