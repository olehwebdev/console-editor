# Console Editor

Electron app: `src/main` (main process), `src/preload`, `src/renderer` (React 19 + zustand, [Feature-Sliced Design](https://feature-sliced.design): `app → pages → widgets → features → entities → shared`). How it works: [docs/SPEC.md](docs/SPEC.md). UI tokens and components: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Contribution rules: [CONTRIBUTING.md](CONTRIBUTING.md).

Before pushing:

```bash
npm run typecheck
npm run lint:fsd
npm test
xvfb-run -a npm run test:e2e   # builds, then drives the real app (headless Linux needs xvfb)
```

## Branches (git flow)

Name every branch `<prefix>/<topic>`. The topic is 2–4 lowercase kebab-case words saying what changes (`feature/react-effects-review`), with no issue number or agent name. `release/` and `hotfix/` take the bare version instead (`release/1.3.0`, no `v`). Use one branch per pull request; a change of several kinds takes the prefix of its main purpose.

| Prefix | For | Starts from |
|---|---|---|
| `feature/` | Anything that isn't a fix: new behaviour, refactors, docs, tests, tooling, CI | `main` |
| `bugfix/` | A fix that ships with the next release, whether or not the bug is in a released version | `main` |
| `release/` | A release that needs more than its version commit (`release/1.3.0`) | `main` |
| `hotfix/` | Only when the maintainer asks for a patch release (`hotfix/1.2.1`) | the latest release tag (`v1.2.0`; `git fetch --tags` first) |

There is no `develop` branch; `main` plays its part. That is also why the git-flow CLI doesn't apply (it needs two branches), so use plain git.

Every branch goes back into `main` through a pull request, which is also what runs CI: it runs on pull requests and on `main`, not on pushes to other branches.

A plain release is the CHANGELOG-and-version commit plus its tag on `main` (CONTRIBUTING › Releasing). A `release/` or `hotfix/` branch works differently:

- it ends with its own version commit, and the tag goes there, because `main` may already hold unreleased work;
- it merges back with a merge commit, not squashed or rebased, so the tag stays in `main`'s history.

Agents: when the environment assigns a generated branch (`claude/…`) and says to push only there, use the git flow name instead; that instruction gives way to this rule.

1. Before the first push, check the name is free (`git ls-remote --heads origin feature/<topic>` prints nothing; otherwise pick another). Then rename the branch you're on (`git branch -m feature/<topic>`), and if it didn't start from the table's starting point, rebase it onto that (`git rebase origin/main`).
2. If the generated branch is already on `origin` and a pull request is open from it, or you can't tell, keep pushing there: deleting it would close the pull request. Otherwise push the git flow branch, then delete the generated one from `origin`. If the delete is refused, say so; the maintainer can delete it on GitHub.
3. Leave other sessions' branches alone.
4. If pushing the git flow branch is refused, push to the generated name instead and say so. Either way, name the branch in your reply.

## Code structure

- **One function or component per file**, named after it (`startBridge.ts`, `SaveDemo.tsx`, `useLayout.ts`). A file may instead hold data only: constants (`constants.ts`), types (`types.ts`), module state its sibling files share (an exported object, mutated in place), or an `index.ts` that only re-exports. A store (`create(...)`) or a class counts as one. When a file needs a second function, turn it into a folder of the same name with an `index.ts`, so its imports don't change. The entry points the build names (`src/main/index.ts`, `src/preload/index.ts`, `src/renderer/src/app/index.tsx`) hold startup statements instead. Tests are exempt.
- **No magic values.** Name every literal that drives logic: ids, keys and prefixes, channel and event names, durations, sizes used in more than one place, and any value that has to match another system (Monaco command ids, `execCommand` names, `KeyboardEvent.key`, env vars). A constant goes at the top of the file that uses it, or in the folder's `constants.ts` when several files do; app-wide ones go in `shared/config` (renderer) or `src/shared/constants.ts` (both processes). Display copy, Tailwind classes and identity values (`0`, `1`, `''`, `true`) stay inline.
- **No `switch`.** Dispatch through a typed table (`Record<Union, Handler>`, or a mapped type when each handler takes its own member), so a new union member fails typecheck until it's handled (see `app/model/bridge/`). An if/else chain or nested ternary over one value counts as a switch.

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
