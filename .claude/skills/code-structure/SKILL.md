---
name: code-structure
description: How to keep this repo's code thin and split by concern (files of at most 150 lines, one function, component, class or store per file, no magic values, no switch). Use it before adding code to a file or creating one, whenever a file nears 150 lines, when `npm run lint:structure` fails, and when refactoring a class, component or types file.
---

# Keeping code thin in Console Editor

The rules live in `CLAUDE.md › Code structure`; `npm run lint:structure` (`scripts/check-structure.ts`) enforces them, and CI runs it. This skill is how to follow them without fighting them.

## Before you write

1. Find where the code belongs by layer and concern: main process (`src/main/<area>/`), shared contract (`src/shared/`), renderer slice (`app → pages → widgets → features → entities → shared`, see `docs/DESIGN_SYSTEM.md`).
2. Open the target folder. If the file you'd edit is near 150 lines, or your change adds a second concern to it, split first (below), then add your code in its own file.
3. Name the new file after the one thing it holds: `sinceInput.ts`, `useDragCursor.ts`, `ResourceTracker.ts`, `EntryRow.tsx`.

## How to split

| What grew | Split it into | Keep |
|---|---|---|
| A class (a controller, service, store) | A coordinator class that owns the public API, plus collaborator classes that own their own state (`ResourceTracker`, `WriteQueue`, `BatchSender`), plus pure functions for stateless steps (parsing, building payloads, sanitizing) | Its name and methods; collaborators get what they need through the constructor or a small typed context, never through globals |
| A component | Sub-components, one custom hook per concern (`useFollowBounds.ts`), handler factories, `constants.ts`, `types.ts` | The exact DOM, classes, ARIA and motion props; each effect keeps its one-line "why" comment and full cleanup (CLAUDE.md › React components and effects) |
| A function with branches per case | A typed table (`Record<Union, Handler>` or a mapped type), each handler in the table or in a file of its own | Exhaustiveness: a new union member must fail typecheck |
| A types or constants file | A folder split by domain (`types/console.ts`, `types/workspaces.ts`) with an `index.ts` re-exporting everything | Every import path |
| A test fixture or a long test | Nothing: tests are exempt | |

When `Foo.ts` becomes a folder, create `Foo/Foo.ts` (the coordinator) and `Foo/index.ts` re-exporting what `Foo.ts` exported, so `import { Foo } from './Foo'` still works. When the file already lives in a folder with an index, add siblings.

Good examples in the tree: `src/renderer/src/app/model/bridge/` (typed event and command tables), `src/main/console/` (a service with its frame registry and value-preview helpers), `src/main/store/` (stores with sanitizers and helpers in their own files).

## Values and dispatch

- Name every literal that drives logic: ids, keys, prefixes, channels and event names, durations (`DURATION` steps), shared sizes, anything another system must match. Put it at the top of the file that uses it, in the folder's `constants.ts` when several do, or app-wide in `shared/config` / `src/shared/constants.ts`.
- No `switch`, and no if/else chain or nested ternary comparing one value: dispatch through a typed table.

## Check before you push

```bash
npm run typecheck && npm run lint:fsd && npm run lint:structure && npm test
xvfb-run -a npm run test:e2e
```

A refactor changes no behaviour: the tests pass unchanged. For shared UI components, the design-system gallery (`CONSOLE_EDITOR_GALLERY=1`) should render the same before and after.
