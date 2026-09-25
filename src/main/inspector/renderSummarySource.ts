import { MAX_COMMIT_BATCH, MAX_RENDERED, MAX_TYPES, RENDERS_BINDING, RENDERS_FLUSH_MS } from './constants';
import { RENDER_REASONS_JS } from './renderReasonsSource';
import { ACTION_TRIGGER_MS } from './stores/constants';

/**
 * Page-side, inside the React hook stand-in (`REACT_HOOK_SOURCE`): what a commit
 * did, while renders are recorded (the binding is there). From the root down,
 * each component fiber is compared with its other copy: mounted (no copy),
 * rendered (React flagged it PerformedWork) and why (props, hook or class state,
 * a store's snapshot, a context's value, else its parent), or skipped although
 * its parent rendered (memo, or the same props). A subtree whose children are
 * the same fibers as before took no part and isn't walked. Summaries are handed
 * over every `RENDERS_FLUSH_MS`; component functions go by id (`RENDERED_TYPES`), the first `MAX_TYPES`
 * (a page making a new one each render goes on unlocated). The tree is walked without recursion, so a deep
 * one can't run out of stack, and why a component rendered is worked out only for those listed.
 * A store action just before (`lastAction`, from the store stand-in) is named once.
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
    if (!typeIds.has(fn)) {
      if (typeList.length >= ${MAX_TYPES}) return -1;
      typeIds.set(fn, typeList.push(fn) - 1);
    }
    return typeIds.get(fn);
  };
  ${RENDER_REASONS_JS}
  const targetOf = (event) => {
    const target = event.target;
    if (target === window) return 'window';
    return target && target.nodeType === 1 ? target.tagName.toLowerCase() + (target.id ? '#' + target.id : '') : null;
  };
  // The event being handled as React commits; the scheduler's own messages (on a MessagePort) don't count.
  const triggerOf = (event) => (event && (event.target === window || (event.target && event.target.nodeType)) ? { type: event.type, target: targetOf(event) } : null);
  // The store action React committed right after, named by one commit only.
  const actionOf = () => {
    if (!lastAction.type || performance.now() - lastAction.at > ${ACTION_TRIGGER_MS}) return null;
    const action = { store: lastAction.store, type: lastAction.type };
    lastAction.type = '';
    return action;
  };
  // Its own render's time (selfBaseDuration), where React measures it; a skipped one didn't render.
  const selfDuration = (f, kind) => (kind !== 'skip' && typeof f.selfBaseDuration === 'number' ? f.selfBaseDuration : null);
  const summarize = (root) => {
    const components = [];
    let more = 0;
    const add = (f, kind, extra) =>
      components.length < ${MAX_RENDERED}
        ? components.push(Object.assign({ name: nameOf(f.type), key: f.key == null ? null : String(f.key), type: typeId(f.type), kind, memo: false, reasons: [], duration: selfDuration(f, kind) }, extra && extra()))
        : (more += 1);
    // One fiber: listed if it took part; whether it did work, for its children.
    const visit = (f, parentWorked) => {
      const prev = f.alternate;
      const worked = didWork(f);
      if (!prev && isComponent(f)) add(f, 'mount');
      else if (prev && isComponent(f) && worked) add(f, 'render', () => ({ reasons: reasons(f, prev, parentWorked) }));
      else if (prev && (isComponent(f) || f.tag === MEMO_TAG) && !worked && parentWorked) add(f, 'skip', () => ({ memo: f.tag === MEMO_TAG || f.tag === SIMPLE_MEMO_TAG }));
      return worked;
    };
    // Depth first, in order, with the fibers above kept on a stack of their own.
    const top = root.current;
    const parents = [];
    const parentsWorked = [];
    let f = top;
    let parentWorked = false;
    for (;;) {
      const worked = visit(f, parentWorked);
      if (f.child && !(f.alternate && f.child === f.alternate.child)) {
        parents.push(f);
        parentsWorked.push(parentWorked);
        parentWorked = worked;
        f = f.child;
        continue;
      }
      while (!f.sibling && parents.length) {
        f = parents.pop();
        parentWorked = parentsWorked.pop();
      }
      if (f === top || !f.sibling) break;
      f = f.sibling;
    }
    return {
      at: performance.timeOrigin + performance.now(),
      duration: typeof root.current.actualDuration === 'number' ? root.current.actualDuration : null,
      trigger: triggerOf(window.event),
      action: actionOf(),
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
