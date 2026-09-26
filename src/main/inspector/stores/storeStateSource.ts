import { MAX_STATE_KEYS, MAX_STATE_PATHS, MAX_STORE_CHANGES, PREVIEW_LENGTH, SIGNATURE_LENGTH, STATE_DEPTH, TEXT_DEPTH } from './constants';

/**
 * Page-side, in the store stand-in (`STORE_HOOK_JS`): what an action changed in a
 * store's state, `STATE_DEPTH` levels deep. A value is written out as text, bounded
 * (arrays with their length first, as DevTools shows them), both to show it and to
 * tell whether it changed. Redux's, NgRx's and Zustand's states are replaced, never
 * changed in place, so the state before is kept by reference and compared by
 * identity (`diffRefs`); Pinia's and Vuex's are changed in place, so the state
 * before is written out first (`snap`) and compared as text (`diffSnaps`). Only the
 * deepest paths that changed are listed.
 */
export const STORE_STATE_JS = String.raw`
  const isPlain = (value) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  };
  const text = (value, room) => {
    const out = [];
    let left = room;
    const put = (part) => {
      if (left <= 0) return;
      out.push(part.length > left ? part.slice(0, left) + '…' : part);
      left -= part.length;
    };
    const walk = (v, depth) => {
      if (left <= 0) return;
      if (v === null || v === undefined) return put(String(v));
      const type = typeof v;
      if (type === 'string') return put(stringify(v));
      if (type === 'function') return put('ƒ ' + (v.name || ''));
      if (type === 'bigint') return put(v + 'n');
      if (type !== 'object') return put(String(v));
      if (Array.isArray(v)) {
        put('(' + v.length + ') ');
        if (depth === 0) return put('[…]');
        put('[');
        for (let i = 0; i < v.length && left > 0; i++) {
          if (i) put(', ');
          walk(v[i], depth - 1);
        }
        return put(']');
      }
      if (v instanceof Date) return put(isNaN(v.getTime()) ? 'Invalid Date' : v.toISOString());
      if (v instanceof Map || v instanceof Set) return put((v instanceof Map ? 'Map' : 'Set') + '(' + v.size + ')');
      const keys = Object.keys(v);
      if (depth === 0) return put('{' + keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', …' : '') + '}');
      put('{');
      keys.forEach((key, i) => {
        if (left <= 0) return;
        if (i) put(', ');
        put(key + ': ');
        walk(v[key], depth - 1);
      });
      return put('}');
    };
    try {
      walk(value, ${TEXT_DEPTH});
    } catch (err) {
      put('?');
    }
    return out.join('');
  };
  const preview = (value) => text(value, ${PREVIEW_LENGTH});
  const clip = (signature) => (signature.length > ${PREVIEW_LENGTH} ? signature.slice(0, ${PREVIEW_LENGTH}) + '…' : signature);
  const keysOf = (...values) => [...new Set(values.flatMap((v) => (isPlain(v) ? Object.keys(v).slice(0, ${MAX_STATE_KEYS}) : [])))];
  const snap = (state) => {
    const out = new Map();
    const add = (path, value, depth) => {
      if (out.size >= ${MAX_STATE_PATHS}) return;
      out.set(path, text(value, ${SIGNATURE_LENGTH}));
      if (depth > 1) for (const key of keysOf(value)) add(path + '.' + key, value[key], depth - 1);
    };
    try {
      if (isPlain(state)) for (const key of keysOf(state)) add(key, state[key], ${STATE_DEPTH});
      else add('state', state, 1);
    } catch (err) {
      // What could be read is compared.
    }
    return out;
  };
  // The deepest paths whose text differs: a parent changes with its children.
  const diffSnaps = (before, after) => {
    const changed = [...new Set([...before.keys(), ...after.keys()])].filter((path) => before.get(path) !== after.get(path));
    return changed
      .filter((path) => !changed.some((other) => other.startsWith(path + '.')))
      .slice(0, ${MAX_STORE_CHANGES})
      .map((path) => ({ path, from: clip(before.has(path) ? before.get(path) : 'undefined'), to: clip(after.has(path) ? after.get(path) : 'undefined') }));
  };
  const diffRefs = (a, b) => {
    const changes = [];
    const visit = (x, y, path, depth) => {
      for (const key of keysOf(x, y)) {
        if (changes.length >= ${MAX_STORE_CHANGES}) return;
        const was = x ? x[key] : undefined;
        const now = y ? y[key] : undefined;
        if (was === now) continue;
        const at = path ? path + '.' + key : key;
        if (depth > 1 && isPlain(was) && isPlain(now)) visit(was, now, at, depth - 1);
        else if (preview(was) !== preview(now)) changes.push({ path: at, from: preview(was), to: preview(now) });
      }
    };
    try {
      if (a === b) return changes;
      if (isPlain(a) || isPlain(b)) visit(isPlain(a) ? a : null, isPlain(b) ? b : null, '', ${STATE_DEPTH});
      else if (preview(a) !== preview(b)) changes.push({ path: 'state', from: preview(a), to: preview(b) });
    } catch (err) {
      // What could be read is compared.
    }
    return changes;
  };
`;
