/** What a page-stack finding is, in the order the Page stack lists them. */
export const STACK_CATEGORIES = ['ui', 'meta', 'state', 'bundler'] as const;
export type StackCategory = (typeof STACK_CATEGORIES)[number];

/** The builds a finding can name. */
export const STACK_BUILDS = ['production', 'development'] as const;
export type StackBuild = (typeof STACK_BUILDS)[number];

export interface StackLibrary {
  name: string;
  category: StackCategory;
  /** How a frame showed it, by the signal the detector names: the evidence the Page stack gives. */
  signals: Record<string, string>;
}

/**
 * Everything the page stack can find, by id. The detector (main process) reports
 * ids and signals from this table only, and the renderer names them from it, so
 * nothing a page says is shown but a version.
 */
export const STACK_LIBRARIES = {
  react: {
    name: 'React',
    category: 'ui',
    signals: { hook: 'its renderer registered with the DevTools hook', fiber: "React's keys on the page's elements (no renderer registered)" },
  },
  vue: { name: 'Vue', category: 'ui', signals: { app: '__vue_app__ on the element it is mounted on' } },
  vue2: { name: 'Vue', category: 'ui', signals: { instance: '__vue__ on the element it is mounted on' } },
  angular: { name: 'Angular', category: 'ui', signals: { attribute: 'ng-version on its root element' } },
  angularjs: { name: 'AngularJS', category: 'ui', signals: { global: 'window.angular' } },
  svelte: { name: 'Svelte', category: 'ui', signals: { global: 'window.__svelte' } },
  lit: { name: 'Lit', category: 'ui', signals: { global: 'window.litElementVersions' } },
  jquery: { name: 'jQuery', category: 'ui', signals: { global: 'window.jQuery' } },
  next: { name: 'Next.js', category: 'meta', signals: { data: 'window.__NEXT_DATA__ (pages router)', flight: 'self.__next_f (app router)' } },
  nuxt: { name: 'Nuxt', category: 'meta', signals: { payload: 'window.__NUXT__', root: 'the #__nuxt element' } },
  remix: { name: 'Remix', category: 'meta', signals: { context: 'window.__remixContext' } },
  reactRouter: { name: 'React Router', category: 'meta', signals: { context: 'window.__reactRouterContext (framework mode)' } },
  gatsby: { name: 'Gatsby', category: 'meta', signals: { root: 'the #___gatsby element' } },
  astro: { name: 'Astro', category: 'meta', signals: { island: '<astro-island> elements' } },
  redux: { name: 'Redux', category: 'state', signals: { standIn: 'a store created with the Redux DevTools stand-in of the framework hooks' } },
  pinia: { name: 'Pinia', category: 'state', signals: { vue: "$pinia in the Vue app's globals" } },
  vuex: { name: 'Vuex', category: 'state', signals: { vue: "$store in the Vue app's globals" } },
  mobx: { name: 'MobX', category: 'state', signals: { global: 'window.__mobxGlobals' } },
  apollo: { name: 'Apollo Client', category: 'state', signals: { global: 'window.__APOLLO_CLIENT__' } },
  webpack: { name: 'webpack', category: 'bundler', signals: { chunks: 'a webpackChunk… global (webpack 5)', jsonp: 'window.webpackJsonp (webpack 4)' } },
  vite: { name: 'Vite', category: 'bundler', signals: { client: 'the /@vite/client script (its dev server)' } },
  parcel: { name: 'Parcel', category: 'bundler', signals: { global: 'a parcelRequire… global' } },
  turbopack: { name: 'Turbopack', category: 'bundler', signals: { global: 'window.TURBOPACK' } },
} as const satisfies Record<string, StackLibrary>;

export type StackLibraryId = keyof typeof STACK_LIBRARIES;
