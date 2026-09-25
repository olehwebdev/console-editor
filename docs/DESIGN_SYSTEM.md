# Console Editor design system

The editor UI is a calm, near-black workspace in which the **code and the live page are the brightest things on screen**. Chrome is quiet: hairline borders, soft elevation, one warm accent for actions, and a lime "live" signal for anything currently being served from an override. Motion is physical and quick: springs for things you touch, ease-out for things that appear. It never makes you wait.

References: the user's IDE shots (activity rail, tree explorer, pill tabs, breadcrumbs, rounded menus, warm-orange/lime accents), [beUI](https://beui.dev) motion components (MIT; ported pieces keep their license header), [Bencho](https://bencho.dev) interaction patterns (command palette, liquid toggle), and icons from [Hugeicons](https://hugeicons.com) (`@hugeicons/core-free-icons`, MIT).

---

## 1. Tokens

All colors are CSS custom properties in `src/renderer/src/app/styles/tokens.css`, exposed to Tailwind through `@theme inline`. **Components use semantic utilities only** (`bg-surface`, `text-fg-muted`, `border-line`…), never raw colors.

### Surfaces (dark)

| Token | Use | Value |
|---|---|---|
| `--canvas` | window background, title bar | `oklch(13.5% 0.004 285)` |
| `--surface` | sidebar, page panel header | `oklch(16% 0.005 285)` |
| `--surface-editor` | editor + Monaco background | `oklch(15% 0.004 285)` |
| `--surface-raised` | tabs (active), inputs, cards | `oklch(20% 0.006 285)` |
| `--surface-overlay` | menus, palette, toasts, tooltips | `oklch(21% 0.006 285 / 0.92)` + backdrop blur |
| `--scrim` | backdrop behind the palette and dialogs | `oklch(13.5% 0.004 285 / 0.6)` |
| `--hover` / `--pressed` | row & control states | white at 5% / 8% |
| `--line` / `--line-strong` | hairlines / focus-adjacent borders | white at 7% / 12% |

### Text

| Token | Use |
|---|---|
| `--fg` `oklch(95% 0 0)` | primary text |
| `--fg-muted` `oklch(70% 0.01 285)` | secondary text, inactive tabs |
| `--fg-subtle` `oklch(52% 0.01 285)` | placeholders, captions, line numbers |

### Accents and status

| Token | Meaning | Value |
|---|---|---|
| `--accent` | primary actions, focus ring, active rail item, CORS rules | ember `oklch(72% 0.19 45)` |
| `--accent-grad` | primary button fill | `linear-gradient(135deg, oklch(78% 0.18 65), oklch(66% 0.23 30))` |
| `--live` | override active / served, "live" dot | lime `oklch(88% 0.2 128)` |
| `--info` | links, iframe and worker markers, header rules, response overrides' glyph, GraphQL operations | sky `oklch(76% 0.12 235)` |
| `--warning` | upstream changed | amber `oklch(82% 0.15 80)` |
| `--danger` | destructive, errors; block rules and blocked files | `oklch(67% 0.2 25)` |
| `--kind-js` / `--kind-css` / `--kind-html` | file-kind glyph tints | yellow / blue / orange |
| `--workspace-ember` … `--workspace-rose` | the colour picked for a workspace's rail tile (ember, amber, lime, teal, sky, indigo, violet, rose): the tile is the colour at 15 % with a 35 % ring, the letter in full. The console gives each frame one of them too (from the frame's key, so a service keeps its colour): its chip is the colour at 15 % with the name in full | `oklch(68–86% 0.12–0.19 …)` |

### Typography

- **Geist Variable** for UI, **Geist Mono Variable** for code, URLs, counts (bundled via `@fontsource-variable`, no network).
- Scale: `text-[11px]` caps labels (tracking 0.06em, `--fg-subtle`), `text-xs` (12) captions, `text-[13px]` UI body (default), `text-sm` (14) dialog body, `text-lg` empty-state title. Numbers use `tabular-nums`.

### Shape and elevation

- Radii: `rounded-md` (6) chips & rows, `rounded-lg` (8) inputs & buttons, `rounded-xl` (12) menus & tabs, `rounded-2xl` (16) palette & dialogs, `rounded-full` pills & switches.
- Elevation: overlays get `shadow-overlay` (`0 24px 60px -12px rgb(0 0 0 / .65), 0 0 0 1px var(--line)`) and a 12px backdrop blur. Panels are separated by hairlines, not shadows.

### Spacing and density

4 px grid. Rows are 26 px (tree) / 28 px (lists), controls 28 px (`h-7`), title bar 44 px, status bar 26 px, activity rail 48 px wide. The rail holds the views (Explorer, Actions, Search), a hairline, the workspaces (28 px tiles in 36 px hit areas; the active one gets a `--fg` bar on the left, gliding with `SPRING_LAYOUT`, the others sit at 65 % opacity), +, and Settings at the bottom.

---

## 2. Motion

Presets live in `shared/lib/motion.ts` (ported from beUI's `ease.ts`):

| Preset | Use |
|---|---|
| `EASE_OUT` `[0.16, 1, 0.3, 1]` | anything appearing (fade/slide), 160–220 ms |
| `SPRING_PRESS` | press feedback (to `PRESS_SCALE`, 0.97) on buttons/rows; icon buttons and rail tiles go to `ICON_PRESS_SCALE`, 0.9 |
| `SPRING_LAYOUT` | shared-layout glides: active tab pill, rail indicator, hover highlight |
| `SPRING_PANEL` | menus, palette, dialogs entering |
| `SPRING_SWAP` | icon/label swaps (Save → Saved ✓) |
| `SLIDE_IN_X` | −6 px: where list rows and sidebar views slide in from |

Durations come from one scale, `DURATION`, shortest first; a component picks a step rather than writing seconds:

| Step | `short1` | `short2` | `short3` | `short4` | `medium1` | `medium2` | `medium3` | `medium4` | `long1` | `long2` | `long3` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ms | 80 | 100 | 120 | 140 | 160 | 180 | 200 | 220 | 260 | 280 | 300 |

Short steps suit exits and reduced-motion fades (a tooltip leaving: `short1`), medium ones fades and slides in (a backdrop: `medium1`), long ones the rare larger entrance (an empty state rising: `long1`). A component's own scales and offsets (how far a menu grows in from) are named constants at the top of its file.

Rules:
1. **Respect reduced motion.** `MotionConfig reducedMotion="user"` at the root; springs collapse to fades.
2. **Only transform and opacity** on hot paths (tree rows, tabs). Height animations only for expand/collapse of sections.
3. **Durations:** ≤ 220 ms (`medium4`) for UI feedback, no animation longer than 320 ms; loops such as the skeleton's shimmer are the exception.
4. **Continuity over decoration:** one moving highlight per list (shared layout), tabs slide into place, the Save button morphs into "Saved", the switch thumb carries weight.
5. The website is a native view drawn above the DOM, so nothing HTML can sit on top of it. `PagePreview` reports where it is (`setNativeViewRect` in `shared/lib`), and floating UI handles it one of three ways:
   - **Modal overlays** (palette, menus, dialogs) register with `useRegisterOverlay`: the view is swapped for a still snapshot while they are open.
   - **Tooltips** are too frequent to capture the page for, so they place themselves off the view (other side, then sliding along the edge).
   - **Monaco's floating widgets** (hovers, suggestions, parameter hints, its context menu) can't be placed by us: `guardFloatingWidgets` freezes the page only while one of them actually overlaps the view.

---

## 3. Icons

Hugeicons (stroke, 1.5 px) through one wrapper: `shared/ui/icon` → `<Icon icon={Search01Icon} size={16} />`. Sizes: 14 (inline), 16 (controls, default), 18 (rail). Icons inherit `currentColor`; file kinds get tinted glyphs (`JavaScriptIcon`, `CssFile01Icon`, `Html5Icon`), and so do rule actions (`BlockIcon` in `--danger`, `HeadersIcon` in `--info`, `CorsIcon` in `--accent`; `RULE_ACTION_GLYPHS` in `entities/rule`). A blocked file's name is struck through in `--fg-subtle`: never colour alone. Original sources get their language's glyph (`SourceIcon` in `entities/source-map`): TypeScript and JSX (`TypescriptIcon`, `ReactIcon`) in `--info`, JS, CSS and HTML in the kind tints, anything else `FileCodeIcon`. Read-only is marked with a lock (the **Read-only** badge) and a locked-file tab glyph (`FileLockedIcon`) in `--info`, never by colour alone.

---

## 4. Components (`src/renderer/src/shared/ui`)

Each component lives in its own folder with an `index.ts` public API. Props below are the contract.

| Component | API (essentials) | Notes |
|---|---|---|
| `Button` | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger'`, `size: 'sm' \| 'md'`, `leading?/trailing?: ReactNode`, `loading?` | press spring; primary uses `--accent-grad` |
| `IconButton` | `icon`, `label` (tooltip + aria-label), `active?`, `size?` | square 28 px, tooltip built in |
| `Input` | `leading?`, `trailing?`, `size?`, `mono?` + native props | focus ring = accent at 40% |
| `Kbd` | `keys: string[]` | renders ⌘/Ctrl per platform |
| `Badge` | `tone: 'neutral' \| 'live' \| 'warning' \| 'info' \| 'accent'`, `dot?` | pill, 11 px |
| `Counter` | `value: number` | digit roll (number ticker) |
| `Switch` | `checked`, `onCheckedChange`, `size?: 'sm' \| 'md'`, `tone?: 'live' \| 'accent'` | beUI weighted-thumb switch |
| `Tooltip` | `content`, `side?`, `shortcut?: string[]` | 400 ms open delay, instant when moving between tooltips |
| `Menu` / `ContextMenu` | `items: MenuItem[]` (`label`, `icon?`, `shortcut?`, `danger?`, `onSelect`, `separator?`) | scale-in from pointer, keyboard nav |
| `CommandPalette` | `open`, `onOpenChange`, `groups: {heading, items: CommandItem[]}[]`, `placeholder` | fuzzy filter, spring panel, moving highlight |
| `ToastStack` + `toast()` | `toast({title, description?, tone?, action?})` | stacked, swipe/auto-dismiss, bottom-left of the editor; its width is capped by `--preview-w` (published by the preview pane) so it never reaches the native page view |
| `ConfirmDialog` + `confirm()` | `confirm({title, body, confirmLabel, tone}) => Promise<boolean>` | replaces `window.confirm` |
| `UrlMatcherFields` | `value: UrlMatcher`, `onChange`, `onEnter?`, `testIdPrefix?`, `autoFocus?` | the match type menu, the pattern and "ignore ?query", as siblings the caller lays out in a wrapping row; shared by an override's match row and rule pages |
| `Popover` | `open`, `onOpenChange`, `anchor: HTMLElement \| null`, `side?: 'right' \| 'bottom'`, `label` | a few controls beside an element (editing a workspace's tile, the Network panel's breakpoints); not modal: Esc (focus back on the anchor), a press or focus outside, window blur or resize close it; a `Menu` opened from inside it counts as inside (Esc there closes the menu only); registers as an overlay like menus |
| `HoverHighlight` | wraps a list; one pill follows the hovered row | port of beUI SharedLayoutBg |
| `Section` | `title`, `count?`, `actions?`, `defaultOpen?` | height auto animation, caps header |
| `Tree` | rows rendered by the caller; `TreeRow` = `depth`, `expanded?`, `onToggle?`, `selected?`, `icon`, `label`, `meta?` | 26 px rows, guide lines, chevron rotates |
| `EditorTabs` | `items`, `activeId`, `onSelect`, `onClose`, `onReorder?`, `renderLabel?`, `trailing?`, `onTabContextMenu?` | layout pill, enter/exit width animation; a click selects without taking focus from the editor |
| `PaneTabs` | `tabs: {id, label, count?}[]`, `value`, `onChange`, `label`, `caps?` | a pane's views as a strip of words (Console / Network, a request's Headers / Payload / Response): the shown one in `--fg` over a 2 px ember underline, the others `--fg-subtle`; one tab stop, arrows move and show (WAI-ARIA tabs, automatic activation); `caps` sets them as the pane's heading (`label-caps`). A tab's `count` (what waits in it: requests paused at a breakpoint) shows beside its label in the warning tone while above zero. A toolbar that holds them keeps their width and lets its filter give way |
| `PanelResizer` | `onResize(delta, total)`, `onResizeStart?`, `onResizeEnd?`, `onReset?`, `orientation?`, `value?/min?/max?`, `hairline?` | window-splitter handle between panels: an 8 px hit area, a 2 px accent line on hover (after 200 ms), focus and drag, and a grip that says it can be dragged: three 2 px dots (`--fg-muted`, brightening to `--fg`) in a 7×24 px tab (`--surface-raised`, `--line-strong` outline turning `--accent` with the line) that bulges out of the panel's border on its left (top, when horizontal), so the border seems to curve around the dots. Nothing reaches past the border: that may be the native page view or a clipped edge. The tab is part of the handle and can be grabbed too |
| `Spinner`, `Shimmer` | loading states | shimmer for "Pretty-printing…" |
| `EmptyState` | `icon`, `title`, `children` | used by editor & preview |

---

## 5. Architecture: Feature-Sliced Design

```
src/renderer/src/
  app/        bootstrap, IPC → stores bridge (model/bridge/), motion config, global styles, gallery
  pages/      editor/          — composes widgets into the workspace layout; owns the layout store, the session
                               sync and workspace switching (they reopen files through features)
              page-window/     — the website's own window: the page-preview widget alone
              actions-window/  — the Actions panel's own window: the actions-panel widget alone
  widgets/    title-bar, activity-bar, explorer, editor-panel, page-preview, status-bar, settings-panel,
              command-palette, console-panel, actions-panel, network-panel
  features/   navigate-page, open-resource (also original sources, the jumps between them and bundles,
              and which of a bundle's originals the Explorer shows open), save-override, toggle-override,
              delete-override, close-tab, edit-match-rule, format-document, compare-changes,
              filter-resources, update-settings, update-app, edit-workspace, run-in-frame, filter-console,
              name-frame, clear-console, expand-console-value, detach-page, rule/ (a slice group:
              quick-actions, edit, toggle, delete), action/ (a slice group: run, edit, detach), edit-response-rule,
              network/ (a slice group: filter, clear, breakpoints, held, throttle, har, response-tree)
  entities/   page, resource, override, editor-tab, settings, app-update, workspace, frame, console-log, rule,
              source-map, action, network-request, held-request
  shared/     api (typed IPC client), ui (design system), lib (cn, motion, url, format and source-map
              workers, overlays, native view rect, JSON: inferred schemas and quick edits), monaco, config (icons)
```

Rules (checked by `npm run lint:fsd` with [Steiger](https://github.com/feature-sliced/steiger)):
- A layer imports only from layers **below** it: `app → pages → widgets → features → entities → shared`.
- Slices on the same layer never import each other.
- Every slice exposes a public API (`index.ts`); deep imports into another slice are not allowed.
- A layer keeps at most 20 slices at its top: related ones go in a slice group, a plain folder with no public API of its own (`features/rule/`, imported as `@/features/rule/edit`; `features/network/`).
- Segments: `ui/` (components), `model/` (stores, actions, effects), `lib/` (pure helpers), `api/` (IPC calls).

Code shared with the main process (`src/shared`: IPC types, URL matching) is imported as `@common/*`; renderer code uses `@/…`.

## 6. State management

- **Zustand** stores, one per entity (`entities/*/model`), created with `create<State & Actions>()`. State is serializable and normalized (records keyed by id/url); actions are pure state transitions.
- **UI-only state lives with the slice that owns the UI**, never in entities: the workspace layout in `pages/editor/model`, the palette's open state in `widgets/command-palette/model`, a feature's own transient state in that feature (`compare-changes`' diff source, `filter-resources`' query), and the overlay counter in `shared/lib`.
- **Side effects live in features** (`features/*/model`): they call `shared/api`, then update entity stores through their actions. Widgets call `shared/api` directly only for stateless view plumbing: the native page view's bounds and snapshot (`PagePreview`) and revealing the overrides folder.
- **Events are batched:** the bridge queues resource, navigation, iframe and worker events and applies them in order once per animation frame (every 250 ms while the window is hidden), so a page reporting thousands of files rebuilds the tree once per frame, not once per file. Console rows already come batched from the main process (every 50 ms at most), so each batch is one store update.
- **One IPC bridge**: `startBridge()` in `app/model/bridge/` subscribes to `window.consoleEditor.onEvent` once and routes events into entity stores (and main-menu commands into features) through typed handler tables, one handler per event type and per menu command.
- **Selectors everywhere**: components subscribe to the smallest slice (`useStore(s => s.byId[id])`), lists use `useShallow`; derived data (resource tree, filtered lists) is computed in `lib/` and memoized.
- **Page tabs keep their own edits.** A tab that isn't a file (What's New, a rule page, a new-rule page) is a `PageTab`, a union by `page` kind. Each kind declares whether it belongs to the app or to the workspace (`PAGE_SCOPES`: workspace pages close on a switch), whether it holds edits (`PAGE_DIRTY_CHECKS`), and which view renders it (`PAGE_VIEWS` in `widgets/editor-panel`), so a new kind fails typecheck until it has all three. A rule page's unapplied edits are a draft on its tab (`{ base, value, rowKeys }`), not form state, so they survive switching tabs; the form shows them only while `base` is still the saved rule, and the rule's own Apply landing rebases what was typed meanwhile.
- **Non-serializable objects stay out of stores**: Monaco models and editor instances live in registries (`entities/editor-tab/model/models/`, `shared/monaco/editors/`) keyed by tab id; the store only holds metadata (dirty, saved version, diff mode). Decoded source maps live in the source-map worker; `entities/source-map` keeps each bundle's state and file list.

## 7. Accessibility

Visible focus rings on every control (`focus-visible:ring-2 ring-accent/50`), full keyboard support in menus, palette, tree and tabs, `aria-*` roles on switches/tabs/tree, contrast ≥ 4.5:1 for text on surfaces, and no information conveyed by color alone (live/override states also have icons or labels).
