# Console Editor

Electron app: `src/main` (main process), `src/preload`, `src/renderer` (React 19 + zustand, [Feature-Sliced Design](https://feature-sliced.design): `app → pages → widgets → features → entities → shared`). How it works: [docs/SPEC.md](docs/SPEC.md). UI tokens and components: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Contribution rules: [CONTRIBUTING.md](CONTRIBUTING.md).

Before pushing:

```bash
npm run typecheck
npm run lint:fsd
npm test
xvfb-run -a npm run test:e2e   # builds, then drives the real app (headless Linux needs xvfb)
```

## React components and effects

An effect is for keeping a component in step with something **outside React**: `window`/`document` listeners, observers, timers, IPC, the native page view, Monaco, a store subscription used for a side effect. Aim for none; a component needs one at most in the usual case. Before writing `useEffect` or `useLayoutEffect`, check the list below: most "needs" have a better tool.

| Instead of an effect that… | Do this |
|---|---|
| copies props or state into other state (`useEffect(() => setDraft(url), [url])`) | Derive it during render: `const value = draft ?? url`. Don't keep state whose only reader is an effect |
| resets local state when a prop changes | Give the component a `key` (e.g. `key={override.id}`), or keep edits together with the value they were based on and ignore stale ones during render (see `MatchRule`). Last resort: adjust state during render (`if (!frozen && snapshot) setSnapshot(null)`) |
| reacts to something the user did | Do it in the event handler (cursor on `pointerdown`, restored where the drag ends; the refusal shake on press) |
| hands a callback or handle up to a parent | Call it from the handler, or wire it at the composition root (`startBridge(pageCommands)`); module-level functions over global stores need no registration |
| focuses an element on mount | `autoFocus` |
| observes a DOM node for as long as it exists | A ref callback that returns its cleanup (React 19), kept stable: module-level, or memoized if it needs component values |
| keeps the latest props in a ref for listeners (`useLayoutEffect(() => { ref.current = fn })`, or `ref.current = fn` during render) | `useEffectEvent`, called from inside the effect's listeners, timers or cleanup. Never write refs during render. A plain ref is still right for values read by callbacks an effect doesn't create (timers started in handlers, a library's `onExitComplete`) |
| subscribes to a store to copy it into state | The store's hook (`useLayout(selector)`) or `useSyncExternalStore` |

When an effect is the right tool:

- **One concern, one effect.** Don't split a concern across effects: a setter and a separate unmount-only clear, or a reset and the timer it feeds, are one effect. Don't merge unrelated concerns just to lower the count either; if a component really syncs several external things, give each its own commented effect, or move them into a named custom hook.
- **Say why** in a one-line comment above it: what outside thing it keeps in step.
- **Clean up everything the setup did**: listeners, observers, timers, animation frames, and external state such as the native view's bounds. An unmount must leave nothing behind (a hidden preview must take the page view with it).
- **`useLayoutEffect` only** when the DOM has to be measured or changed before paint.
- **Honest dependencies.** Store actions read once at module level (`const { toggle } = usePalette.getState()`) are stable and need no deps; don't suppress or fake deps to avoid a re-run, use `useEffectEvent` for the non-reactive parts.

Other component rules:

- Don't define components inside other components.
- Compute cheap derived values during render; `useMemo`/`useCallback` only for expensive work or a reference something depends on.
- Subscribe to narrow store slices and select stable references (a selector returning a new object re-renders forever; use `useShallow`).
- Keys are stable ids; an index is fine only for static lists that never reorder.
