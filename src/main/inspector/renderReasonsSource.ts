import { MAX_CHANGES } from './constants';

/**
 * Page-side, in the commit summary (`RENDER_SUMMARY_JS`, whose fiber tags and helpers it uses): whether a
 * fiber did work in a commit, and why a component rendered: the props, hook or class state, store
 * snapshots and context values that changed (the first `MAX_CHANGES` of each, their values in short),
 * else its parent, else its own update with nothing changed.
 */
export const RENDER_REASONS_JS = `
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
`;
