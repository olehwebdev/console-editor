# Research: a component inspector (which framework, which component, which file)

**Question.** On a site you didn't build, can the app tell which UI library each frame runs (React, Vue, Angular…), point at an element and name the component that rendered it and the source file it lives in, and show how data reaches it (props, state, context, stores) and why it re-rendered?

**Short answer.** Yes, and production builds included. Three findings shape the design:

1. **Production builds keep enough at runtime.** React puts its fiber on every DOM node and hands its renderer to a DevTools hook if one is present. Vue keeps the app and the root vnode on the mount element. Angular keeps a view registry that leads from a host element to its component instance. Only the names are minified.
2. **The file comes from V8, not from the framework.** `Runtime.getProperties` on a component's function returns its `[[FunctionLocation]]` (script, line, column). The app's source-map support (SPEC §6.8) turns that into the original file and line. The map's `names` even give back the real name of a minified function: in a minified React build, `Sd` came back as `CartItem` in `CartItem.jsx:5`, and its click handler as `handleAdd` in `CartItem.jsx:8`.
3. **The app already has almost every piece.** It has a CDP session per frame (cross-site iframes too), each frame's main-world context, handles to page values, source maps with jumps to original and bundle code, page tabs and rail views. What's missing are the `DOM`, `Overlay` and `Debugger` domains, and a way to run code in a frame without it showing as console rows.

Mockups: five screens drawn in the app's design system accompany this proposal. They are **Stack** (what each frame runs), **Pick** (an element under the pointer), **Component page** (source, props, state, context, handlers), **Data flow and renders**, and **States and fallbacks**. The wireframe in §3.1 sums them up.

---

## 1. What the app has today

| Piece | Where | What an inspector gets from it |
|---|---|---|
| A CDP session per frame | `PageInterception` hands each frame's session to one `SessionObserver` (`src/main/engine/PageInterception/types.ts`), today the `ConsoleService` (`PageController.ts:56-57`) | The same hand-over for an `InspectorService`. The observer slot takes one object, so it becomes a small fan-out |
| Frames and their main-world contexts | `ConsoleFrames.target(frameId)` → `{ sessionId, id, uniqueId }` (`src/main/console/ConsoleFrames/ConsoleFrames.ts:107`) | Where to run an adapter for a frame. Known only while **Record the console** is on, as the Actions panel already requires (SPEC §6.9) |
| Running code in a frame | `ConsoleService.evaluate` → `evaluateInContext` (`Runtime.evaluate`, `replMode`, `includeCommandLineAPI`) | The pattern, not the call: `evaluate` always writes console rows. The inspector needs a silent call (`returnByValue`, its own object group) |
| Handles to page values | `EntryLog` handles, `ownProperties()` (`Runtime.getProperties`, merging `internalProperties`) | `[[FunctionLocation]]` and `[[Scopes]]` already come back as internal properties. Console handles die with their row, so the inspector keeps its own group per pick |
| A script that runs before the page's | `SriGuard` (`src/main/engine/InterceptionEngine/SriGuard.ts`): `Page.addScriptToEvaluateOnNewDocument` per session, synced with a setting | The same for the framework hooks (§3.4) |
| Source maps | Worker requests in `shared/lib/source-map/types.ts` (`toOriginal` takes a tab's text and an offset); `names` are kept in the `TraceMap` (`host/parse/rewriteSources.ts:47`) but never returned | A new `toOriginalRaw { bundleUrl, line, column }` → `{ url, line, column, name }`. `SOURCE_MAP_HANDLERS` makes it fail typecheck until it has a handler |
| Opening an original at a line | `openOriginalSource(bundleUrl, kind, url, { reveal })` (`features/open-resource/model/sources/openOriginalSource.ts:23`) | **Open original**, as is |
| Bundle code, then an override | Open-resource with the position mapped through pretty-printing (`toView`), then Save | **Go to bundle code** and **Edit in an override**, as is |
| Page tabs | `PageTab` union, `PAGE_SCOPES`, `PAGE_DIRTY_CHECKS` (`entities/editor-tab`), `PAGE_VIEWS` (`widgets/editor-panel/ui/EditorPanel/pageViews.ts`) | The Stack page and component pages are two more kinds, like rule pages |
| Rail views | `SidebarView` (`widgets/activity-bar/ui/ActivityBar/ActivityBar.tsx:7`), `SIDEBAR_VIEWS` (`pages/editor/ui/EditorPage/constants.ts:8`) | The **Inspect** view |
| Frame chips | `entities/frame`: `frameKey`, `frameLabel`, `frameTone`, `FrameChip` | Which frame a stack, component or render belongs to, in the console's colours |

Nothing in `src/main` uses `DOM`, `Overlay`, `DOMDebugger`, `Debugger`, `Runtime.callFunctionOn`, `Runtime.queryObjects` or `DOM.resolveNode` yet; their names go in `src/main/engine/constants.ts`.

## 2. Verified

Probed in Chromium 141 over CDP, the way the app drives its page view. The apps were a small cart (a list of items, each with an **Add** button, a context for the currency, and a store), each built with esbuild twice: production (minified, with a source map) and development. They were React 19.3.0, Vue 3.5.43 (`__VUE_PROD_DEVTOOLS__` off) and Angular 22.2.0 (zoneless, JIT, `ngDevMode` off). The integration tests (§5) should pin each row, as `test/integration` does for the engine.

**Picking an element**

| Fact (verified) | Consequence |
|---|---|
| With `DOM` and `Overlay` enabled and the document requested (`DOM.getDocument`), `Overlay.setInspectMode({ mode: 'searchForNode' })` sends `Overlay.nodeHighlightRequested` (a `nodeId`) as the pointer moves, and `Overlay.inspectNodeRequested` (a `backendNodeId`) on a click. The click doesn't reach the page | The picker is CDP's own: hovering updates the sidebar, and a click pins the element without pressing the page's button |
| Chromium draws the highlight and its tooltip (tag, size, accessibility) inside the page | Nothing HTML has to sit over the native page view (DESIGN_SYSTEM §2, rule 5). The component's name shows in the sidebar, not in the page |
| `DOM.resolveNode({ backendNodeId })` gives a handle that `Runtime.callFunctionOn` runs an adapter on | One call from a picked node to a component description |
| `DOM.setInspectedNode` makes `$0` the picked element in code run with `includeCommandLineAPI`, as the console runs it | **Use as $0 in console** |

**React**

| Fact (verified) | Consequence |
|---|---|
| Every element React renders has `__reactFiber$<random>` and `__reactProps$<random>`, in production too | From an element, `fiber.return` leads through its components up to the root |
| A stand-in `__REACT_DEVTOOLS_GLOBAL_HOOK__`, installed with `Page.addScriptToEvaluateOnNewDocument`, is handed the renderer by production react-dom (`inject` with `version: '19.3.0'`, `bundleType: 0`, `rendererPackageName: 'react-dom'`) and told of each commit (`onCommitFiberRoot`). In the probe, the script ran only on a session with `Page` enabled, as the app's sessions are | The exact version and build type without the React DevTools extension, and a live render log (§3.5) |
| Production names are minified (`Sd`, `l2`, `t2`). React 19 has no `_debugSource`; development builds have `_debugOwner` and `_debugStack` | Names come from the source map, or from `displayName`. `_debugSource` must not be relied on |
| `Runtime.getProperties` on the component's function returns `[[FunctionLocation]]` (`scriptId`, line, column) with the `Debugger` domain off. Turning `Debugger` on replays `Debugger.scriptParsed` for every script already parsed, which maps the `scriptId` to its URL; turning it off again at once is enough | Where a component is defined, without keeping the debugger on |
| Through the bundle's map: the component → `src/react/CartItem.jsx:5`, name `CartItem`; its button's `onClick` (from `__reactProps$`) → `CartItem.jsx:8`, name `handleAdd` | File, line and real name in a minified production build |
| In a development build, the component's `_debugStack`, mapped through the map, names the line of JSX that created the element (`<CartItem>` inside `CartList`) | **Created at**, besides **Defined in** |
| The component's hooks are the `memoizedState` list; a `useState` hook has `queue.dispatch`. Calling it from CDP re-rendered the production app (quantity 1 → 10) | State is readable and can be set in production. Hook *names* aren't in the fiber: they come from the original source (§3.6) |
| `fiber.dependencies.firstContext.context` is the context a component reads; up the `return` chain, the fiber whose `type` is that context (tag 10) holds the provided `value` | **Context: CartContext `{currency: "EUR"}`, provided by App** |
| The button's own click listener is React's no-op (`noop$1` in react-dom); real handlers are props | For React, handlers come from props, not from `DOMDebugger.getEventListeners` |
| After a click, the last committed root showed which components did work (the `PerformedWork` flag) and whose state changed, compared with `fiber.alternate`; siblings that didn't render had neither | **Why it rendered**: props that changed, state, context or store |

**Vue**

| Fact (verified) | Consequence |
|---|---|
| In production, the mount element carries `__vue_app__` (with `version`), `_vnode` (the root vnode) and `data-v-app`. Elements carry no `__vueParentComponent` or `__vnode` (development builds have both), `app._instance` is unset, and the Vue DevTools hook hears nothing | The tree is walked from `_vnode` (`vnode.component.subTree`, then `children`): an element's component is the one whose subtree holds a vnode with that `el` |
| Each component instance gives its `type.name` (the `name` option; `<script setup>` compiles `__name` in production too), `props`, `parent` and `provides` | Names, props and "provided by" without a source map |
| `setupState` is empty when `setup` returns a render function, which is what `<script setup>` compiles to with an inline template (production). The render function's `[[Scopes]]` hold the setup's variables: the props, `currency "EUR"`, the `qty` ref and `handleAdd`, under minified names | State from closures, named through the map's `names` (§3.6) |
| `setup` → `main.js:8`; the button's `onClick` (the vnode's props) → `main.js:11`, name `handleAdd` | The same source lookup as React |
| `compiler-sfc` doesn't add `__file`; bundler plugins do, in development | `__file` is a bonus, not the way to find a file |

**Angular**

| Fact (verified) | Consequence |
|---|---|
| `ng-version="22.2.0"` is on the root element in both builds | Detection and version |
| Development builds publish `window.ng` (`getComponent`, `getOwningComponent`, `getListeners`, `getDirectiveMetadata`…); production builds don't | In development, the official API does everything |
| In production, a component's host element carries `__ngContext__`, a number (its view's id); plain template elements don't | A starting point without `ng` |
| `Runtime.queryObjects(Map.prototype)` finds Angular's view registry: the id gives the view that declares the host, the host's slot in it is the component's own view, and that view's context slot (8) is the component instance (`$S`, with `sku`, `price`, the `qty` signal and `handleAdd`). Its constructor → `main.js:5`; `qty.set(7)` updated the page | Components, inputs and signals in production. These are private internals: the adapter checks the shape and is tested for each Angular major before it is trusted |

**Not probed yet** (known from documentation or source, to be pinned when built): picking inside a cross-site iframe needs `Overlay.setInspectMode` on that frame's own session, as DevTools does per target; Svelte 5 (`window.__svelte.v`), Lit (`litElementVersions`), Preact, Solid, and Next.js and Nuxt markers (`__NEXT_DATA__`, `__NUXT__`); a custom element's class through `customElements.get(tag)`; a Redux DevTools stand-in; `Debugger.setSkipAllPauses` against pages that loop on `debugger`.

## 3. Proposal

### 3.1 What it shows

```
┌─ 127.0.0.1:5174 / shop ───────────────────────────────────────────────── Search files and commands ─┐
│      │ INSPECT          [pick]    │ [Page stack] [CartItem x]                    │ < > R url [pick] │
│ </>  │ v STACK                    │ CartItem  React 19.3  production  (cart)     │                  │
│ >_   │   (top)     Angular 22.2   │ +- src/features/cart/CartItem.tsx:5 ----+    │    the page      │
│[pick]│   (cart)    React 19.3     │ | minified as Sd, named by the map      |    │                  │
│      │   (billing) Vue 3.5  !     │ | [Open original] [Go to bundle code]   |    │ Chromium draws   │
│      │ v COMPONENTS    (cart) v   │ | [Edit in an override]                 |    │ the highlight    │
│      │   App                      │ +---------------------------------------+    │ on the picked    │
│      │    Provider                │ Overview · Data flow · Renders 14            │ element          │
│      │     CartPage               │ PROPS from CartList   STATE (hooks)          │                  │
│      │      CartList              │  sku "A1"              qty 2  [edit]         │                  │
│      │       CartItem A1   <      │  price 89              line {sku, qty}       │                  │
│      │       CartItem B2          │ CONTEXT  CartContext {currency} <- App:14    │                  │
│      │                            │ HANDLERS onClick -> handleAdd  CartItem:8    │                  │
│      │                            │ RENDERED BY App > ... > CartItem  [$0]       │                  │
├──────┴────────────────────────────┴──────────────────────────────────────────────┴──────────────────┤
│ Acme Shop · 2 iframes · [Angular · React · Vue]                                               UTF-8 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Inspect view** (a rail view after Actions). **Stack** lists each frame with its UI library, version and build, and a warning when it has no source maps. **Components** is a tree of one frame's components, picked with a frame chip. Hovering a row highlights its elements in the page (`Overlay.highlightNode`); pressing it opens the component page.
- **Pick** (the preview toolbar's button, `Ctrl/⌘+Shift+C` as in DevTools, the palette): every frame's session enters inspect mode. While the pointer moves, the view shows the element and its component chain, each with its file. A click pins it: the component page opens, the tree reveals the component, `$0` is the element, and every session leaves inspect mode. Esc stops.
- **Page stack** (a page tab): per frame, each finding with its evidence ("`ng-version` on `<app-root>`", "renderer registered with the DevTools hook", "`__vite__mapDeps`"): UI library, build, meta-framework, bundler, state library, source maps. The status bar sums it up (**Angular · React · Vue**) and opens it.
- **Component page** (a page tab per component, like a rule page) has three tabs:
  - **Overview:** where it is defined (the original file through the map, else the bundle and pretty-printed line), with **Open original**, **Go to bundle code** and **Edit in an override**. Then props (and which component passed them), state, context and who provides it, the handlers on its elements with their files, and the chain that rendered it.
  - **Data flow:** what comes in (props from the parent, context from the provider, store slices) and what goes out (elements, state it sets, actions it dispatches, callbacks it calls up).
  - **Renders:** this component's commits and why each happened.
- **Renders** (a tab beside Console in the bottom panel): every commit in every frame, with what triggered it (an event, a store action, a message from another frame) and each component that rendered, with the reason ("store `state.cart.count` 2 → 3", "skipped: memo, props equal"). It is the micro-frontend view: a click in `cart` (React) followed, in `billing` (Vue), by the store update the message caused.
- **States:** no source map (framework name, bundle location, **Load a source map…**); development builds (real names, **Created at**); Angular in production (private registry, labelled); plain JavaScript (no framework: the element's listeners, via `DOMDebugger.getEventListeners`, with their files); **Record the console** off (as in the Actions view, with **Turn it on**); web components (the class from `customElements.get`).

### 3.2 How a pick works

```mermaid
sequenceDiagram
  participant UI as Renderer (Inspect view)
  participant Main as InspectorService (main)
  participant S as Frame session (CDP)
  participant Page as Frame's main world
  UI->>Main: inspect:pick
  Main->>S: DOM.enable, Overlay.enable, Overlay.setInspectMode(searchForNode) on every frame session
  S-->>Main: Overlay.nodeHighlightRequested(nodeId), throttled
  Main->>S: DOM.resolveNode, Runtime.callFunctionOn(adapter)
  S->>Page: adapter walks fibers / vnodes / views
  Main-->>UI: inspect-hover (element, chain of names and locations)
  S-->>Main: Overlay.inspectNodeRequested(backendNodeId)
  Main->>S: setInspectMode(none) everywhere, DOM.setInspectedNode
  Main->>S: callFunctionOn(adapter.describe), Runtime.getProperties on each function ([[FunctionLocation]])
  Main->>S: Debugger.enable, setSkipAllPauses, Debugger.disable (scriptId → URL, cached per session)
  Main-->>UI: inspect-picked (ComponentInfo: frame, framework, chain, props, state, context, handlers; bundle URL + line + column per function)
  UI->>UI: source-map worker toOriginalRaw → original file, line, name
```

- **Adapters** are plain functions, serialized with `Function.prototype.toString` and run with `Runtime.callFunctionOn` in the frame's main world, as DevTools runs its own helpers. They close over nothing. Each one is a folder with one file per step: `detect` (by value), `findComponent` (element → handle), `describe` (a plain description plus the handles for functions and values), and `tree` (one level of children, loaded as the tree opens).
- **Order of adapters:** React (fiber keys) → Vue 3 (`__vueParentComponent`, else the vnode walk from the nearest `__vue_app__`) → Vue 2 (`__vue__`) → Angular (`ng.getComponent`, else the registry) → custom elements → the plain DOM (listeners only).
- **Values** go back as previews, like console values (`{sku: 42}`, `ƒ handleAdd`), with handles in an object group per pick (`inspector:<n>`). The group is released when the pick is replaced or its page closes. Expanding a value reuses the console's `getProperties` path.
- **Everything the page returns is untrusted** (a page can patch `Object.keys` or lie in `displayName`): capped in size, stripped of control characters, shown as text, never run (SPEC §8).

### 3.3 Detection

Once per frame, when its main-world context appears (`Runtime.executionContextCreated`, `isDefault`) and again 1 s after `load`, and on **Scan again**: one silent `Runtime.evaluate` with `returnByValue` runs `detect`. It checks these signals, each named in the result as its evidence:

| Library | Runtime signal | Version | Build |
|---|---|---|---|
| React | the hook's `renderers`, else `__reactFiber$`/`__reactContainer$` keys on the root's elements | `renderer.version` | `bundleType` (0 production, 1 development) |
| Vue 3 / 2 | `__vue_app__` / `__vue__` on an element | `app.version` / `Vue.version` | `__vueParentComponent` present (development) |
| Angular | `[ng-version]` | the attribute | `window.ng.getComponent` present (development) |
| AngularJS, Svelte 5, Lit, Preact, Solid, Ember, jQuery | `angular.version`, `__svelte.v`, `litElementVersions`, Preact's vnode keys, `_$HY`, `Ember`, `jQuery.fn.jquery` | as listed | — |
| Next.js, Nuxt, Remix, Gatsby, Astro | `__NEXT_DATA__`/`next.version`, `__NUXT__`, `__remixContext`, `#___gatsby`, `astro-island` | where exposed | — |
| Redux, Pinia, Vuex, MobX, Apollo | the Redux stand-in's stores, `$pinia`/`$store` in the Vue app's globals, `__mobxGlobals`, `__APOLLO_CLIENT__` | where exposed | — |
| Bundler | `webpackChunk*`, `__vite__mapDeps`, `parcelRequire`, `TURBOPACK`; and the resource list's URLs (`/_next/static/`, `/_nuxt/`, `/@vite/client`) | — | — |

Source-map coverage comes from what the Explorer already knows per bundle (SPEC §6.8), checked only when the Stack page is opened. Results go to the renderer as `stack-changed` per frame, and are dropped with the frame.

### 3.4 Framework hooks (installed before the page's scripts)

A frame's framework is inspectable without them, but live renders need React to talk to someone. Per session, like the SRI guard: a minimal `__REACT_DEVTOOLS_GLOBAL_HOOK__` (`supportsFiber`, `inject`, `onCommitFiberRoot`, `onCommitFiberUnmount`, `onPostCommitFiberRoot`, `checkDCE`, `renderers`) that records renderers and, while **Renders** records, a summary of each commit. Later, a `__REDUX_DEVTOOLS_EXTENSION__` stand-in records store actions and the stack that dispatched them, so a dispatch leads back to the line that made it (`handleAdd`, `CartItem.tsx:10` in the mockups).

- **Setting:** **Framework hooks** [on], like **Record the console**: a hook is something a page can notice, and some sites act differently when they think DevTools is open. It takes effect from the next load, since a hook must be in place before React loads.
- **Never in the way:** a page that brings its own hook, or the React DevTools extension, keeps it (the stand-in is installed only when none exists). Hook code catches its own errors.
- **Getting commits out:** batched in the page every 100 ms and pushed through `Runtime.addBinding`, like console rows (SPEC §6.7), capped at the last 5,000 commits. A binding is a global the page can see, which is another reason for the setting.

### 3.5 Why it rendered

For each fiber that did work in a commit, compared with its `alternate`:

- **props**: the keys whose values differ (identity), with short previews;
- **state**: the hook indexes whose `memoizedState` differs (named once hook names are known, §3.6);
- **context**: the contexts in `dependencies` whose value changed;
- **store**: a `useSyncExternalStore` hook whose snapshot changed (Redux's `useSelector`, Zustand);
- **parent**: none of these, so it rendered because its parent did. The row shows it dimmed, and a memoized component that bailed out shows as **skipped**.

The trigger is best effort: the event being dispatched when the commit started (`window.event`), the last store action in the same task, or a `message` event from another frame.

Vue's production reactivity leaves no commit trail. There, **Renders** would list which components re-rendered, with no reason, by wrapping each instance's `update` while it records (not probed yet). Angular's is left to signals' own debugging (`ɵgetSignalGraph` in development).

### 3.6 Where names come from

| What | Production | Development |
|---|---|---|
| Component | the map's `names` at its `[[FunctionLocation]]` (it named React's function components; Vue's `setup` and the Angular class got none), else `displayName`, the `name` option or `__name`, Angular's selector, a custom element's tag | the function's own name |
| File and line | the function's location, through the map | the same, plus React's `_debugStack` (**Created at**) and Vue's `__file` when a bundler adds it |
| React hooks | parsed from the original's text (`const [qty, setQty] = useState(1)` → `qty`), as React DevTools does, with `@babel/parser` (already in the repo) in the source-map worker | the same |
| Vue `<script setup>` state | `[[Scopes]]` variables, renamed through the map's `names` at their declarations | `setupState` |
| No map | the minified name, marked as such | — |

The map is often missing in production: Vite (`build.sourcemap`), Next.js (`productionBrowserSourceMaps`) and the Angular CLI's production configuration all leave it out by default, and teams upload theirs to an error tracker instead. **Load a source map…** takes a local `.map` for a bundle, kept per workspace, through the same worker.

### 3.7 Safety and cost

- **Debugger:** only on for a lookup, with `Debugger.setSkipAllPauses(true)` sent first so a page's `debugger` statement can't freeze it, then off again. `scriptId → URL` is cached per session until it navigates.
- **`Runtime.queryObjects`** walks the heap: it runs once per Angular frame and per navigation, and its result (the registry) is kept by handle.
- **Work on demand:** nothing runs until the Inspect view, a pick or the Renders tab asks. The tree loads one level at a time, at most 2,000 rows per level.
- **Frames:** each frame is inspected on its own session, so cross-site iframes work the way the console does. Workers have no DOM and are left out.

## 4. Code layout sketch

Every file follows the code-structure rules (at most 150 lines, one function each).

```
src/shared/types/inspector.ts         FrameStack, LibraryHit, ComponentRef, ComponentInfo, CodeLocation, ValuePreview, RenderCommit
src/shared/ipcChannels.ts             inspect:stack|pick|cancel|component|tree|highlight|release|set-state
src/shared/types/events.ts            stack-changed, inspect-hover, inspect-picked, inspect-cancelled, renders
src/main/engine/constants.ts          DOM.*, Overlay.*, DOMDebugger.getEventListeners, Debugger.*, Runtime.callFunctionOn|queryObjects|addBinding
src/main/inspector/
  InspectorService/                   the coordinator: a SessionObserver; pick, describe, tree, highlight, release
  pickMode/                           inspect mode on every session, hover throttling, the pinned node
  functionLocation/                   [[FunctionLocation]] + scriptId → URL (Debugger replay, cached)
  adapters/react|vue|angular|customElements|dom/   detect, findComponent, describe, tree (page-side functions)
  hooks/                              the React stand-in (later Redux), installed per session like SriGuard
  renders/                            the binding, batches, the 5,000-commit cap
src/main/PageController/              a fan-out observer: ConsoleService and InspectorService
src/main/ipc/registerInspectorIpc.ts  editor-only channels
src/renderer/src/
  shared/lib/source-map/              toOriginalRaw (with the map's name), and local maps
  entities/inspector/                 stacks by frame, the picked component, the tree, the hover, renders
  features/inspect/pick/              start and stop picking, the shortcut
  features/inspect/open-component/    the component page tab, sources through the map
  features/inspect/set-state/         later: setting a hook's or signal's value
  widgets/inspect-panel/              the rail view: Stack, Components, the picking banner, under the pointer
  widgets/editor-panel/               PAGE_VIEWS: stack and component (Overview, Data flow, Renders)
  widgets/renders-panel/              the Renders tab beside the console
  widgets/page-preview/               the pick button
  widgets/status-bar/                 the stack chip
  widgets/command-palette/            Pick an element, Page stack, Go to component…
```

`SidebarView` gains `'inspect'`, `PageTab` gains `stack` and `component` (workspace scope, never dirty), and settings gain `frameworkHooks`.

## 5. Tests

| Layer | What |
|---|---|
| Unit | With a fake CDP transport: inspect mode on every session and off on a click, Esc or detach; hover throttling; resolve → adapter → locations in order; `Debugger` enabled with pauses skipped and disabled again, the URL cache; handle groups released; hooks installed and removed per session with the setting, and not over a page's own hook; the commit cap |
| Renderer | The Stack page's model; the tree's lazy levels; each component page section from fixture `ComponentInfo`s; `toOriginalRaw` with names (`test/fixtures/esbuildApp.ts` has a real map with `names`); hook names parsed from originals |
| Integration | New fixture pages built once and checked in (as `esbuildApp.ts` is): the cart in React, Vue and Angular, production and development, and a micro-frontend page mixing them in cross-site iframes (as `services.html` does). Pin every row of §2 in real Chromium |
| End-to-end | Pick **Add** in the cart iframe: the page shows `CartItem` at `CartItem.tsx:5`; **Open original** opens it read-only at line 5; **Go to bundle code**, edit, save, and the page runs the edit. The Stack page lists three frames with their libraries. A click is logged in **Renders** with its reasons |

## 6. Phases

1. **Stack:** detection per frame with evidence, the Stack page and the status bar chip, and the React hook stand-in with `inject` only: without it, a page doesn't say which React it runs.
2. **Pick and component pages, React and Vue:** inspect mode, adapters, `[[FunctionLocation]]` through maps with names, props, state, context and handlers (read-only), the Components tree, `$0`.
3. **Renders:** commit summaries from the stand-in, the Renders tab, why it rendered, setting state, hook names from originals.
4. **Angular and the rest:** `ng` in development, the registry in production (labelled), custom elements, plain DOM listeners, **Load a source map…**.
5. **Later:** Redux, Pinia and NgRx timelines; requests by component (`Network.requestWillBeSent`'s initiator stack through the maps); "Save as action" for setting state; a profiler view.

## 7. Decisions to make

| Question | Recommendation | Alternative |
|---|---|---|
| Build it, or ship the official devtools | Build it: one view across frameworks and frames, tied to the maps, overrides and the console | Load the React and Vue DevTools extensions into the site's session (Electron supports DevTools extensions) as a stopgap. That's one panel per framework inside page DevTools; Angular DevTools needs development builds, and none of them leads to an override |
| Where details show | Page tabs (Stack, one per component), like rule pages | All in the sidebar (cramped: the sidebar is about 300 px) |
| Frames and contexts | Reuse the console's (needs **Record the console**, as Actions do) | Its own `Runtime.enable` while recording is off, so Inspect works without the console: a second switch for what page scripts can notice |
| Framework hooks | On by default, with a setting | Off by default, so Renders asks for a setting and a reload first |
| Angular in production | Ship it, labelled, with a test per major | Development builds only |
| Renders | A bottom-panel tab beside Console | Only on the component page (loses the cross-frame view) |
