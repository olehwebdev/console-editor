import { MAX_VUE2_SCAN, STATE_DEPTH } from './constants';

/**
 * Page-side, in the store stand-in (`STORE_HOOK_JS`): Pinia's and Vuex's stores,
 * listened to once recording finds them (`attach`): a Vue 3 app's global
 * properties hold `$pinia` and `$store` (production builds too), a Vue 2 root
 * instance its own. A Pinia store's actions are heard through `$onAction` (the
 * state written out before, and again once the action returns or its promise
 * settles); changes outside an action through a synchronous `$subscribe`, which
 * is a deep watcher (Vue walks the state on every change): it is on only while
 * recording (`detach` takes it off), and only `STATE_DEPTH` levels deep, what the
 * diff shows. A store created later is caught by a Pinia plugin. Vuex's
 * mutations are heard through `subscribe`, after they ran. The other listeners
 * do nothing while nothing records; the states kept are written out again when
 * recording starts.
 */
export const VUE_STORES_JS = String.raw`
  const attached = new WeakSet();
  const refreshers = [];
  const detachers = [];
  const hookPinia = (store) => {
    if (!store || typeof store.$onAction !== 'function' || attached.has(store)) return;
    attached.add(store);
    const name = String(store.$id);
    let snapshot = snap(store.$state);
    let running = 0;
    let unwatch = null;
    const stopWatching = () => {
      if (unwatch) unwatch();
      unwatch = null;
    };
    const onDirect = (mutation) => {
      if (!recording()) return stopWatching();
      if (running) return;
      const next = snap(store.$state);
      const changes = diffSnaps(snapshot, next);
      snapshot = next;
      const payload = mutation.type === 'patch object' ? preview(mutation.payload) : null;
      if (changes.length) record({ store: name, library: 'pinia', type: String(mutation.type), payload, changes, duration: null, stack: stackOf() });
    };
    const watchDirect = () => {
      if (!unwatch) unwatch = store.$subscribe(onDirect, { detached: true, flush: 'sync', deep: ${STATE_DEPTH} });
    };
    refreshers.push(() => {
      snapshot = snap(store.$state);
      watchDirect();
    });
    detachers.push(stopWatching);
    watchDirect();
    store.$onAction(({ name: type, args, after, onError }) => {
      if (!recording()) return;
      const stack = stackOf();
      const before = snap(store.$state);
      const at = now();
      const started = performance.now();
      running += 1;
      const done = () => {
        running -= 1;
        snapshot = snap(store.$state);
        const payload = args.length ? preview(args.length === 1 ? args[0] : args) : null;
        record({ at, store: name, library: 'pinia', type: String(type), payload, changes: diffSnaps(before, snapshot), duration: performance.now() - started, stack });
      };
      after(done);
      onError(done);
    }, true);
  };
  const attachPinia = (pinia) => {
    if (!pinia || typeof pinia.use !== 'function') return;
    if (!attached.has(pinia)) {
      attached.add(pinia);
      pinia.use(({ store }) => {
        if (recording()) hookPinia(store);
      });
    }
    if (pinia._s instanceof Map) pinia._s.forEach(hookPinia);
  };
  const hookVuex = (store) => {
    if (!store || typeof store.subscribe !== 'function' || attached.has(store)) return;
    attached.add(store);
    let snapshot = snap(store.state);
    refreshers.push(() => {
      snapshot = snap(store.state);
    });
    store.subscribe((mutation, state) => {
      if (!recording()) return;
      const next = snap(state);
      const payload = mutation.payload === undefined ? null : preview(mutation.payload);
      record({ store: 'Vuex', library: 'vuex', type: String(mutation.type), payload, changes: diffSnaps(snapshot, next), duration: null, stack: stackOf() });
      snapshot = next;
    });
  };
  const detach = () => detachers.forEach((stop) => stop());
  const attach = () => {
    try {
      refreshers.forEach((refresh) => refresh());
      for (const root of document.querySelectorAll('[data-v-app]')) {
        const properties = root.__vue_app__ && root.__vue_app__.config && root.__vue_app__.config.globalProperties;
        if (!properties) continue;
        attachPinia(properties.$pinia);
        hookVuex(properties.$store);
      }
      const elements = document.querySelectorAll('*');
      let holder = null;
      for (let i = 0; i < elements.length && i < ${MAX_VUE2_SCAN} && !holder; i++) if (elements[i].__vue__) holder = elements[i];
      const vm = holder && holder.__vue__.$root;
      if (vm) {
        attachPinia(vm.$pinia || (vm.$options && vm.$options.pinia));
        hookVuex(vm.$store);
      }
    } catch (err) {
      // Never in the page's way.
    }
    return true;
  };
`;
