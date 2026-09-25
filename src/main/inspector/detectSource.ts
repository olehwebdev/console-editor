/**
 * Run in a frame's main world (by value, silently): what it runs, as
 * `{ id, signal, version, build }` items named after `STACK_LIBRARIES`. Each
 * check stands alone, so a page that throws in one getter loses only that one.
 * Only the first `ELEMENTS_LOOKED_AT` elements are looked through for
 * framework keys: the one a framework mounts on comes early.
 */
export const DETECT_SOURCE = `(() => {
  const ELEMENTS_LOOKED_AT = 2000;
  const BUILDS = ['production', 'development'];
  const w = window;
  const d = document;
  const hits = [];
  const found = (id, signal, version, build) => hits.push({ id, signal, version: version == null ? null : String(version), build: build || null });
  const attempt = (check) => {
    try {
      check();
    } catch (err) {
      // A page's getter threw: that check finds nothing.
    }
  };
  const globals = Object.keys(w);
  const elements = [d.documentElement].concat(Array.prototype.slice.call(d.querySelectorAll('body, body *'), 0, ELEMENTS_LOOKED_AT));
  const keyed = (prefixes) => {
    for (const el of elements) {
      const key = Object.keys(el).find((k) => prefixes.some((p) => k.startsWith(p)));
      if (key) return el[key];
    }
    return undefined;
  };

  attempt(() => {
    const hook = w.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const renderers = hook && hook.renderers instanceof Map ? Array.from(hook.renderers.values()) : [];
    const renderer = renderers.find((r) => r && typeof r.version === 'string');
    if (renderer) return found('react', 'hook', renderer.version, BUILDS[renderer.bundleType]);
    // Fibers carry _debugOwner in development builds only.
    const fiber = keyed(['__reactFiber$', '__reactContainer$', '__reactInternalInstance$']);
    if (fiber) found('react', 'fiber', null, '_debugOwner' in fiber ? 'development' : 'production');
  });
  attempt(() => {
    const root = d.querySelector('[data-v-app]');
    const app = root && root.__vue_app__;
    if (!app) return;
    // The app's context gets reload() in development builds only.
    found('vue', 'app', app.version, app._context && typeof app._context.reload === 'function' ? 'development' : 'production');
    const properties = (app.config && app.config.globalProperties) || {};
    if (properties.$pinia) found('pinia', 'vue', null, null);
    if (properties.$store) found('vuex', 'vue', null, null);
  });
  attempt(() => {
    if (hits.some((hit) => hit.id === 'vue')) return;
    const holder = elements.find((el) => el.__vue__);
    const vm = holder && holder.__vue__;
    if (!vm) return;
    let ctor = vm.$root && vm.$root.constructor;
    while (ctor && !ctor.version) ctor = ctor.super;
    // Components render through a Proxy in development builds only.
    found('vue2', 'instance', ctor && ctor.version, vm._renderProxy !== vm ? 'development' : 'production');
    if (vm.$root.$pinia) found('pinia', 'vue', null, null);
    if (vm.$root.$store) found('vuex', 'vue', null, null);
  });
  attempt(() => {
    const root = d.querySelector('[ng-version]');
    // Only development builds publish the ng debugging API.
    if (root) found('angular', 'attribute', root.getAttribute('ng-version'), w.ng && typeof w.ng.getComponent === 'function' ? 'development' : 'production');
  });
  attempt(() => {
    if (w.angular && w.angular.version) found('angularjs', 'global', w.angular.version.full, null);
  });
  attempt(() => {
    const versions = w.__svelte && w.__svelte.v;
    if (versions && typeof versions.forEach === 'function') found('svelte', 'global', Array.from(versions)[0], null);
  });
  attempt(() => {
    if (Array.isArray(w.litElementVersions) && w.litElementVersions.length) found('lit', 'global', w.litElementVersions[0], null);
  });
  attempt(() => {
    if (w.jQuery && w.jQuery.fn && w.jQuery.fn.jquery) found('jquery', 'global', w.jQuery.fn.jquery, null);
  });
  attempt(() => {
    const version = w.next && w.next.version;
    if (w.__NEXT_DATA__) found('next', 'data', version, null);
    else if (Array.isArray(w.__next_f)) found('next', 'flight', version, null);
  });
  attempt(() => {
    if (w.__NUXT__) found('nuxt', 'payload', null, null);
    else if (d.getElementById('__nuxt')) found('nuxt', 'root', null, null);
  });
  attempt(() => {
    if (w.__remixContext) found('remix', 'context', null, null);
    if (w.__reactRouterContext) found('reactRouter', 'context', null, null);
    if (d.getElementById('___gatsby')) found('gatsby', 'root', null, null);
    if (d.querySelector('astro-island')) found('astro', 'island', null, null);
  });
  attempt(() => {
    if (w.__mobxGlobals || w.__mobxInstanceCount) found('mobx', 'global', null, null);
  });
  attempt(() => {
    if (w.__APOLLO_CLIENT__) found('apollo', 'global', w.__APOLLO_CLIENT__.version, null);
  });
  attempt(() => {
    if (globals.some((k) => k.startsWith('webpackChunk'))) found('webpack', 'chunks', null, null);
    else if (Array.isArray(w.webpackJsonp)) found('webpack', 'jsonp', null, null);
    if (d.querySelector('script[src*="/@vite/client"]')) found('vite', 'client', null, null);
    if (globals.some((k) => k.startsWith('parcelRequire'))) found('parcel', 'global', null, null);
    if (w.TURBOPACK) found('turbopack', 'global', null, null);
  });
  return hits;
})()`;
