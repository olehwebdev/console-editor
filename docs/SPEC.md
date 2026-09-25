# Console Editor: product and implementation spec

Status legend: ✅ built and tested in M1 · 🔜 planned (milestone noted)

## 1. Goal

A desktop app where you enter a website's URL, see every script, stylesheet and HTML document the page loads, open any of them in a VS Code-grade editor, change it, and press Ctrl/Cmd+S. The page reloads running your version. No build, no server access, no certificates.

**Primary user:** a developer who needs to debug or try a fix on a deployed front end (staging or production) of a service too large to build and run locally.

**Non-goals:**
- Deploying changes. Edits live only in the app's browser.
- Editing original TypeScript/JSX sources and rebuilding (research item, §11).
- Being a general-purpose browser.

## 2. User stories

| # | Story | Status |
|---|---|---|
| U1 | I type a URL (or `localhost:3000`) and the site opens in the app | ✅ |
| U2 | I see the scripts, stylesheets and documents the page loaded, grouped by origin, and can filter them | ✅ |
| U3 | I click a file and it opens with syntax highlighting; minified files are pretty-printed first | ✅ |
| U4 | I edit and press Ctrl/Cmd+S; the page reloads and runs my version | ✅ |
| U5 | My overrides survive app restarts; I can turn each one on/off or delete it | ✅ |
| U6 | An override keeps working after a redeploy changes the file's build hash | ✅ (glob match + automatic suggestion) |
| U7 | I can diff my edits against the text I started from | ✅ |
| U8 | I'm told when the live file changed since I created the override, and can diff against the new live version | ✅ |
| U9 | SRI, gzip, caching and service workers don't silently defeat my edits | ✅ |
| U10 | I can open DevTools for the page to use the console, breakpoints and network panel | ✅ |
| U11 | I can edit override files in my own editor (VS Code) and the app picks up changes | 🔜 M2 |
| U12 | Overrides and file listing inside iframes, including cross-site (out-of-process) and nested ones | ✅ |
| U12b | Overrides for scripts loaded by workers | 🔜 M2 |
| U13 | Export/import a workspace's overrides to share them with teammates | 🔜 M2 |
| U14 | Use my own Chrome (existing profile, extensions) instead of the embedded browser | 🔜 M3 |
| U15 | Browse original sources from source maps (read-only) and jump to the matching bundle code | ✅ (§6.7) |
| U16 | I keep a workspace per site or task (its page, tabs, unsaved edits and overrides) and switch between them from the rail, which shows each one's favicon or a colour I pick | ✅ (§5.1) |

## 3. Architecture

```mermaid
flowchart LR
  subgraph Renderer["Editor window (renderer, sandboxed)"]
    UI["React UI (Feature-Sliced Design)"]
    State["Zustand stores (entities)"]
    Monaco["Monaco editor + diff editor"]
    Fmt["Format worker (js-beautify)"]
  end
  subgraph Main["Main process (Node)"]
    IPC["ipc/ (sender-checked handlers)"]
    PC["PageController"]
    Engine["PageInterception → one InterceptionEngine per CDP session"]
    Store["OverrideStore / SettingsStore"]
  end
  subgraph View["WebContentsView (the website)"]
    Site["Target page (no preload, sandboxed)"]
  end
  UI --> State
  UI -- "window.consoleEditor (preload bridge)" --> IPC
  IPC --> PC
  IPC --> Store
  PC --> Engine
  Engine -- "CDP via webContents.debugger" --> Site
  Engine -- reads --> Store
  Store -- "userData/workspace" --> Disk[(disk)]
```

**Why these choices**
- **Electron.** Ships its own Chromium, so interception works the same on every machine and needs neither a certificate nor DevTools to be open. The embedded view is a `WebContentsView` placed next to the editor.
- **CDP `Fetch` domain at the *response* stage.** Keeps the real upstream headers (CORS, cookies, CSP) and lets us hash the upstream body to detect redeploys. The `Request` stage would skip the network but would have to invent headers.
- **Transport-agnostic engine.** `InterceptionEngine` talks only to `CdpTransport { send, on }`. There are adapters for Electron's debugger (app) and Playwright's CDP session (tests); an external-Chrome WebSocket adapter is M3.
- **Monaco.** It is VS Code's editor: syntax highlighting, find/replace, multi-cursor, minimap and a diff editor, running in-process with no language server needed.
- **React 19 + Zustand + Tailwind v4 + Motion.** The UI outgrew hand-written DOM code once it gained a command palette, context menus, virtualized trees and animated panels. Zustand keeps state outside React (the app event bridge writes to it without a component tree) and lets each component subscribe to exactly the slice it renders. The design system (tokens, motion rules, components) is in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
- **Feature-Sliced Design in the renderer.** Layers `app → pages → widgets → features → entities → shared`, each importing only from layers below it, checked by Steiger (`npm run lint:fsd`).

## 4. Source layout

```
src/
  shared/            types.ts (IPC + data model), constants.ts (gallery hash, env var names),
                     ipcChannels.ts (the IPC channel of each API method, for main and preload),
                     matcher/ (URL matching), minified/, version/ (semver comparison),
                     changelog/ (CHANGELOG.md sections)
  main/
    index.ts         app bootstrap: data folder, Chromium switches, single-instance lock
    launch/          createWindow.ts (window, stores, updater, session flush on close), handOver.ts (a second
                     launch's URL), launchState.ts (the open window they share), URL and data-folder helpers
    constants.ts     http(s) URL patterns, file-not-found code
    appInfo.ts       app id and repository URL (shared with electron-builder.ts)
    PageController/  PageController.ts (WebContentsView for the site, navigation, engine wiring), normalizeUrl.ts
    WorkspaceController.ts  workspaces: switching, the page URL, title and favicon each remembers (§5.1)
    favicon/         a page's favicon as a small data URL (sniffed, size-capped)
    sourceMap/       a script's or stylesheet's source map: found (SourceMap/X-SourceMap header or trailing
                     comment, per-kind precedence) and read out of page (http(s) through the site session,
                     data: handed over undecoded; 64 MB, 30 s) (§6.7)
    readCapped.ts    capped streaming reads (favicons, source maps)
    electronTransport.ts  webContents.debugger → CdpTransport
    engine/          PageInterception/ (one engine per CDP session: page + iframes),
                     InterceptionEngine/, transform/ (SRI/source maps/headers, the SourceMap header a response names),
                     cdp/ (transport interface), websocketTransport/ (browser-level CDP, used by tests),
                     constants.ts (CDP command and event names, HTTP status classes)
    store/           OverrideStore.ts, SettingsStore.ts, SessionStore.ts, writeAtomic.ts and their helpers
    update/          UpdateService/ (checks, downloads, installs: §10.1), electronInstaller/ (electron-updater),
                     updateEndpoints.ts (GitHub, or a local update server in tests)
    sitePermissions/ permission policy for the site view
    chromiumFlags/   Local Network Access switches (see §6.5, §8)
    ipc/             registerIpc.ts (sender-checked handlers)
    installMenu.ts   the app menu
  preload/index.ts   contextBridge → window.consoleEditor
  renderer/src/      React UI, Feature-Sliced Design (see DESIGN_SYSTEM.md §6):
    app/             entry, providers, event bridge (main → stores), styles/tokens, component gallery
    pages/editor/    the workspace layout and its persisted layout store; session sync and workspace switching
    widgets/         title-bar, activity-bar, explorer, editor-panel, page-preview, status-bar, settings-panel, command-palette
    features/        open-resource (also original sources and the jumps between them and bundles), save-override, format-document, compare-changes, toggle/delete-override,
                     edit-match-rule, navigate-page, filter-resources, update-settings, close-tab,
                     update-app (notifications, the What's New page, the status-bar entry), edit-workspace
    entities/        page, settings, override, editor-tab (+ Monaco model registry, page tabs, read-only source tabs),
                     resource, source-map (each bundle's map state, the originals tree), app-update (updater state,
                     the bundled CHANGELOG.md), workspace (+ its rail tile)
    shared/          api (preload bridge), ui (design system), monaco, lib (format and source-map workers,
                     overlays, motion), config
test/
  unit/              matcher, transform, store, engine and PageInterception (fake CDP), minified heuristic,
                     source maps (finding, loading, header capture)
  renderer/          resource tree building, palette fuzzy matching, original sources (parsing, positions through
                     pretty-printing, tabs, jumps, tree)
  integration/       engine and iframe sessions against real Chromium + fixture site, source maps in every form
  e2e/               the built Electron app driven by Playwright
  smoke/packaged.ts  a packaged build (installed app) driven over the remote debugging port
  smoke/update.ts    an installed app updated to a newer build from a local stand-in for GitHub
  fixtures/site.ts   fixture site: gzip, SRI (static + runtime), hashed names, iframes, source maps (header,
                     X-SourceMap, comment, data: URI, a stylesheet's, HTML fallback, XSSI, a missing one);
                     sourceMaps.ts builds them, esbuildApp.ts is a checked-in esbuild build
  helpers/           Chromium launcher with the app's flags, WebSocket CDP harness
build/               app icon (icon.png 1024 px original, icon.icns macOS, icon.ico Windows, icons/ Linux sizes),
                     macOS entitlements, NSIS hooks (electron-builder's build resources)
electron-builder.ts  installer configuration
scripts/             release-notes.ts (a release's notes from CHANGELOG.md)
CHANGELOG.md         release notes: shown as What's New, and at the top of each GitHub release
.github/workflows/   ci.yml (checks, tests), release.yml (installers on three systems, update tests, draft release)
```

## 5. Data model

```ts
type ResourceKind = 'Document' | 'Script' | 'Stylesheet';   // CDP resource types we override

interface UrlMatcher {
  type: 'exact' | 'glob' | 'regex';
  pattern: string;        // exact: full URL · glob: `*` = any run of chars · regex: JS RegExp
  ignoreQuery: boolean;   // compare without ?query / #hash (default true)
}

interface Override {
  id: string;             // 8 hex chars
  kind: ResourceKind;
  sourceUrl: string;      // URL the override was created from
  match: UrlMatcher;      // default: { exact, sourceUrl without query, ignoreQuery: true }
  enabled: boolean;
  originalHash: string | null;  // sha256 of the upstream body at creation → redeploy detection
  content: string;        // what gets served (kept in memory: the engine needs it on every request)
  createdAt: number; updatedAt: number;
}
// The diff base (what editing started from, after pretty-print) stays on disk until a diff asks for it.

interface Workspace {      // a saved workflow: see §5.1
  id: string;             // 8 hex chars
  name: string;           // '' → shown as the page's host
  icon: 'favicon' | 'color';  // the site's favicon on its colour, or the name's first letter on it
  color: 'ember' | 'amber' | 'lime' | 'teal' | 'sky' | 'indigo' | 'violet' | 'rose';
  url: string; title: string;  // last page shown, and its title
}

interface SessionState {  // what a workspace reopens (the active one's: on start, or when switched to)
  url: string;            // last page shown
  tabs: { id: string; url: string; kind: ResourceKind; overrideId?: string; originalHash: string | null }[];
  activeTabId: string | null;
}
// Each override belongs to one workspace (`workspaceId` in overrides.json).
```

Originals opened from source maps (§6.7) are tabs of their own kind, kept apart from file tabs as pages are: they are read-only, never saved or restored, and close with the workspace.

**Storage** (`<userData>/workspace/`, written atomically via temp file + rename, one write at a time):

```
overrides.json          { version: 1, overrides: (OverrideMeta & { workspaceId })[] }   // metadata only
files/<id>.<js|css|html>        served content
files/<id>.base.<js|css|html>   diff base (only when it differs from the content)
settings.json (in <userData>)   Settings
session/session.json            { version: 2, activeId, workspaces: (Workspace & SessionState)[] }
session/favicons/<ws>.txt       a workspace's favicon, as a data URL
session/drafts/<tab>.txt        unsaved text of a tab (tab ids are unique across workspaces)
session/drafts/<tab>.base.txt   what that tab's editing started from (tabs not yet saved as overrides)
```

A version 1 `session.json` (one page and its tabs) becomes the first workspace, and overrides saved before workspaces existed (or whose workspace is gone) are given to the active one at start.

**Session restore.** The main process remembers the page URL on every main-frame navigation, for the active workspace. The renderer writes the tab list 300 ms after it changes and a tab's draft 800 ms after typing pauses (the base once per tab); a draft is deleted when its tab is saved, undone back to the saved text, or closed. Closing the window runs a handshake: main sends `flush-session`, the renderer writes whatever is pending and answers `sessionFlushed(ok)`, and only then does the window close (after 5 s, or if a write failed, it asks before closing). On start, the app loads the last URL (a URL on the command line wins), then reopens each tab: an override from the store, a tab with a draft entirely from disk (no network), any other tab by fetching the file again; drafts are applied as one undoable edit, so the tab shows as unsaved and undo reveals the saved text. Tab ids are unique across runs because they name the drafts. Session syncing starts only after restoring, so a fresh start never overwrites the session being restored. Each sync run is bound to one workspace: tab lists are written with its id, and one that arrives for a deleted workspace is ignored.

### 5.1 Workspaces

A workspace is a saved workflow: a page (URL, title and favicon), the tabs open on it with their drafts, and its own overrides. Exactly one is active: its page is shown, its overrides are the ones the engine serves (`OverrideStore.list()`) and the Explorer lists, and new overrides are created in it. `get`/`update`/`remove` still reach any override, so a save still running when the workspace changes lands where it began.

**Switching** (a rail tile, or the palette) runs one at a time:
1. Renderer: wait for running saves, write what is pending (as on close, and again while edits typed meanwhile keep coming in; if a write failed, ask before going on), then, in the same task, stop the session sync and close the file tabs without deleting their drafts. Pages (What's New) stay open.
2. Main (`WorkspaceController.switchTo`): load `about:blank` and clear the history, so nothing the old page does from then on (an in-page navigation, a title, a favicon) is taken for the next workspace's; make the workspace active (in memory at once, so a failed write is reported without leaving the switch half done); point the engine at its overrides (`Fetch` patterns recomputed, `overrides-changed` sent); send `workspaces-changed`; load its last page, clearing the history again once it has loaded, so Back never leads into another workspace's pages.
3. Renderer: reload the workspaces and overrides, reopen the tabs of whichever workspace is now active (the old one again, if switching failed) the way a start does, and sync again (not if the tabs couldn't be reopened: the next change would write over them).

**Favicons.** On `page-favicon-updated` (the page's `<link rel="icon">`s, or `/favicon.ico`), the candidates are fetched in turn through the site's session (up to 256 KB each), recognised by their bytes (PNG, JPEG, GIF, ICO, WebP, SVG; anything else, such as an HTML error page, is skipped), and kept as a data URL: PNG and JPEG scaled down to 32 px, other types kept as they are up to 64 KB. The icon is kept for the workspace active when the page reported it, and only if that workspace is still on the same site once it has loaded; moving a workspace to another site drops its old icon. Icons travel in their own `workspace-favicon` event, so renaming (sent on every keystroke) or a new page title stays small. A title is recorded once it has stayed for a second, as some pages keep changing theirs.

**Creating** adds an empty workspace (in the first colour no other has) and switches to it, with the address bar focused; if the switch doesn't happen, the new workspace is removed again. **Deleting** asks first and removes the workspace's overrides (first: were the workspace to go first and this fail, the next start would hand them to another), then the workspace with its drafts and favicon; the active one hands over to its neighbour first, and the last one can't be deleted. The site's cookies and logins (`persist:site`) are shared by all workspaces.

`CONSOLE_EDITOR_USER_DATA` overrides `<userData>` (used by tests; handy for throwaway profiles).

**Settings** (all booleans; defaults in brackets): reload page on save [on] · pretty-print minified files on open [on] · strip SRI [on] · strip source maps from overrides [on] · disable HTTP cache [on] · bypass service workers [on] · bypass CSP [off].

## 6. Interception engine

### 6.1 Attach
1. Load `about:blank` into the view first (renderer-side CDP commands never answer until a renderer exists).
2. `Page.enable`, `Page.getFrameTree` (remember the main frame id), `Network.enable` with large body buffers (256 MB total, 64 MB per resource) so `Network.getResponseBody` works for big bundles.
3. Apply settings: `Network.setCacheDisabled`, `Network.setBypassServiceWorker`, `Page.setBypassCSP`, and install/remove the runtime SRI guard (`Page.addScriptToEvaluateOnNewDocument`).
4. Compute `Fetch` patterns (§6.2) and `Fetch.enable` them, or `Fetch.disable` when there are none.
5. Navigation waits for attach to finish, so the first load is never missed.

### 6.2 Which requests get paused
Only requests that could need a change are paused (`requestStage: 'Response'`):
- each enabled **exact/glob** override → a precise CDP URL pattern (CDP wildcards `*`/`?` escaped in literal parts; trailing `*` when ignoring the query);
- each enabled **regex** override → `*` restricted to the override's resource type;
- if SRI stripping is on and any script/stylesheet override is enabled → every `Document`.

Patterns are recomputed whenever overrides are created, deleted, enabled/disabled or re-matched. Content-only saves don't touch patterns (content is read at request time).

### 6.3 On `Fetch.requestPaused`
1. Find the override for the URL: exact beats glob beats regex, then the most recently updated wins.
2. **Override found and the upstream response is not a redirect** (3xx + `Location`):
   - if the override has `originalHash` and upstream was 2xx: read the upstream body (`Fetch.getResponseBody`), decode it (base64 → bytes → `charset` from `Content-Type`, UTF-8 fallback), hash it, and emit `upstream-changed` if it differs;
   - body = override content; Documents get SRI stripped (if on); Scripts/Stylesheets get `sourceMappingURL` comments removed (if on);
   - headers = upstream headers **minus** `Content-Encoding`, `Content-Length`, `Transfer-Encoding`, digests, `ETag`, `Last-Modified`, `Cache-Control`/`Expires`/`Pragma` (and `SourceMap`/`X-SourceMap` when stripping), **plus** `Content-Type: <upstream type or default>; charset=utf-8` and `Cache-Control: no-store`;
   - `Fetch.fulfillRequest` with status **200**. This also answers 404/5xx/network errors, so you can patch files that are missing or while the server is down;
   - remember `networkId → overrideId` so the resource list can mark the file "served from override"; emit `override-served`.
3. **Document with SRI stripping on** (2xx HTML): read the body; if it has `integrity` attributes on `<script>`/`<link>`, fulfill with them removed (original status, headers minus body-specific ones).
4. Otherwise `Fetch.continueRequest`. Any error → emit `error` and continue the request, so a bug in the engine never hangs the page.

### 6.4 Runtime SRI guard
Injected before page scripts when SRI stripping is on. It makes the `integrity` property on `HTMLScriptElement`/`HTMLLinkElement` a no-op and drops `setAttribute('integrity', …)` on those elements. This covers loaders that set integrity on lazily created tags.

### 6.5 Iframes (cross-site and nested)

With site isolation, a cross-site iframe runs in its own renderer process and is a **separate CDP target**. `PageInterception` (`src/main/engine/PageInterception/`) runs one `InterceptionEngine` per CDP session: the page's own, plus one per iframe session, recursively. Each engine gets a session-bound transport (`sessionTransport()`), so a request paused on one session is always answered on that same session. Behaviour below was probed against real Chromium; the probes are encoded in `test/integration/iframes.chromium.test.ts`.

| Fact (verified) | Consequence |
|---|---|
| Same-site iframes live in the page's process | Handled by the page's engine; resources are labelled with `frame.depth ≥ 1` |
| A cross-site iframe's **document** is paused and reported on its **parent** session; its subresources on its **own** session | Document overrides and SRI stripping for iframe HTML happen in the parent's engine; the iframe's scripts/styles in its own |
| The iframe target attaches (`Target.attachedToTarget`, `waitingForDebugger: true`) after its document response, with an empty URL | Setup (Page/Network enable, settings, SRI guard, `Fetch.enable`, nested `setAutoAttach`) runs **before** `Runtime.runIfWaitingForDebugger`, so no subresource is missed |
| Cache-disable, service-worker bypass, CSP bypass and the SRI guard don't reach other targets | Applied per session, and re-applied to every live session when settings or overrides change |
| Commands in flight to a session that goes away **never settle** | Each child session tracks its in-flight commands and rejects them when it goes away (later sends fail at once); setup and fan-out have a 5 s timeout; the frame is always resumed in `finally` |
| No detach event is sent for grandchildren when a parent session goes away | Detach cascades through the recorded parent chain |
| Only the iframe's own session can return its document body | `getResourceContent` routes that read to the child session |
| Chromium reuses a target id when a frame gets a new session | Entries are scoped by **session** (`ResourceEntry.iframeId`), never by target id |
| An iframe navigating back to its parent's site loads that document's subresources on **no** session (a Chromium gap). Reloading just that frame doesn't reliably help: Chromium 141 intercepts the reload, Chromium 153 serves the files from the renderer's memory cache, which neither `Fetch` nor the page's cache-disable reaches | Detected: an enabled override whose file arrived unmodified emits `override-missed`; the UI offers a page reload |
| A document served via `Fetch.fulfillRequest` has no IP address space, so Chromium's Local Network Access checks treat it as public and block its requests to loopback/intranet hosts | The app disables those checks for its browser (`src/main/chromiumFlags/`) |
| With the `RenderDocument` feature disabled (Playwright's Electron launcher does this), Electron 44 crashes (SIGSEGV) when a page with out-of-process iframe sessions reloads | `withDisabledFeatures` (`chromiumFlags/`) keeps it enabled whatever else is passed in `--disable-features` |

Auto-attach uses `filter: [{type: 'iframe'}, {exclude: true}]` on every session; workers are excluded for now (M2).

**Events:** resources from cross-site iframes carry `iframeId`; `navigated` with an `iframeId` means that iframe loaded a new document (drop its entries), `iframe-detached` means the session went away (drop its entries and its descendants').

### 6.6 Resource list
- `Network.responseReceived` with type Document/Script/Stylesheet (not `data:`/`blob:`/internal URLs) → entry `{ url, kind, mimeType, status, overrideId?, frame?, iframeId? }`. `frame` (URL and depth) marks files loaded inside an iframe; an iframe's own document is labelled with its new URL.
- **Navigations reset the list when they commit, not when they start.** A main-frame document request (`requestId === loaderId`) only marks a navigation as pending. Until `Page.frameNavigated` commits it, late responses of the old page are not listed, and the new document's own response is held. On commit the list is cleared, `navigated` is emitted, then the held document is listed. A navigation that never commits (a download, a 204, a cancelled load: `Page.frameStoppedLoading` with nothing committed) leaves the list as it was. A commit without a request (back/forward cache, `about:blank`) resets the list too. Each iframe session applies the same rules to its own root frame and tags its `navigated` event with its `iframeId`.
- **Missed overrides:** an enabled override whose URL arrived without being served (it was enabled after the request, or an iframe loaded it on no session, §6.5) emits `override-missed` once per override and URL until the next navigation; the UI offers "Reload page".
- **Content for the editor:** for files served from an override, re-fetch upstream out-of-page (session cookies included) so the edited copy is never mistaken for the original. Otherwise try `Network.getResponseBody`, then `Page.getResourceContent`, then the out-of-page fetch. The result carries a sha256 hash (becomes `originalHash`), and the `SourceMap` (else `X-SourceMap`) header the response named, if any. For a file served from an override that is the upstream response's header, taken at `Fetch.requestPaused` before the override replaces the response (and its header, when source maps are stripped).

### 6.7 Source maps

Scripts and stylesheets the page loaded can show the original files they were built from, read-only, and jump between a line of an original and the bundle code it became. Nothing is read until you expand a bundle or ask for a jump.

**Finding the map** (`src/main/sourceMap/`), always from the file as the server sent it, even when an override serves it:

| File | Wins | Then | The comment |
|---|---|---|---|
| Script | the header | the comment | ECMA-426's rule without parsing: walking back from the end past blank lines and other whole-line comments, the last `//# sourceMappingURL=` (or `//@`, or a one-line `/*# … */`) counts; any code after it means there is none |
| Stylesheet | the comment | the header | Blink's: the last `/*# sourceMappingURL=… */` anywhere, its value up to the comment's end or the line's |

`SourceMap` is read before the deprecated `X-SourceMap`. If the winner fails, the other isn't tried, as in Chrome.

**Reading it:**
- resolved against the bundle's final URL;
- http(s) only, through the site's session, with its cookies only when the map is on the bundle's or the page's origin;
- a `data:` map is handed to the renderer undecoded; every other scheme is refused before any request;
- at most 64 MB and 30 s; a bundle over 16 M characters isn't sent for lining up (its originals can be browsed, not jumped to), so one reply stays under Chromium's IPC limit;
- checked again once per page load: while the bundle's hash and map URL are unchanged, main answers `unchanged` and sends nothing.

**Parsing** happens in a renderer worker (`shared/lib/source-map`, `@jridgewell/trace-mapping`): a BOM and the `)]}'` line are stripped, an HTML page (a single-page app's fallback route) is refused as *not a source map*, index maps are flattened (sections pointing to other files are refused), and sources are resolved as DevTools does (an empty `sourceRoot` is none, and it prefixes only relative sources; the result is resolved against the map's URL, or the bundle's for an inline map). Ignore-listed sources and anything under `/node_modules/` are grouped as **Libraries**.

**Positions through pretty-printing.** The map describes the file as served, but a tab usually shows it pretty-printed, and maybe edited. Both texts are lined up on their characters other than whitespace (JavaScript's `\s` plus U+180E), because js-beautify with the app's options only ever changes whitespace; a common prefix and suffix are matched, so an edited or override tab maps exactly outside the edited part, and a jump into it lands where the edits start and says so. Map lines are split on `\n` only. Original lines without code (types, comments) give way to the nearest line below with some, then above, up to 200 lines each way. A map with more than 1% (and more than 10) of its positions outside its bundle is flagged as possibly from another build.

**Lifetime.** Loaded maps survive navigations (checked again on next use) and are forgotten on a workspace switch. The worker keeps at most 4 maps, 48 MB of map text, decoded; the least recently used is dropped and read again when needed, and the worker shuts down after 3 idle minutes. The store keeps only each map's file list.

**Chromium facts** pinned by `test/integration/sourceMaps.chromium.test.ts`: `Network.responseReceived` carries the `SourceMap` header, and a response fulfilled from an override lacks it when source maps are stripped.

**Not supported:** editing originals; originals the map lists without their text (shown as *not in the source map*, with a way to their bundle code); keeping source tabs across restarts; index-map sections that point to other files; lone CR, LS or PS line breaks in bundles; `debugId`.

## 7. Editor behaviour

| Action | Behaviour |
|---|---|
| Open a resource | If an override matches the URL, open the override instead. Otherwise fetch the live content, pretty-print it if it looks minified (longest line > 1000 chars or average > 150), and open it as an unsaved tab marked "Live file · not overridden" |
| Save (Ctrl/Cmd+S, or **Create override**) | New tab → `createOverride({ content, base, originalHash })`. Override tab → `updateOverride({ content })` when dirty. A save requested while one runs is queued once and sends the latest text when the first finishes. Then reload the page if that setting is on |
| Pretty-print (Shift+Alt+F) | js-beautify in a Web Worker; one undoable edit |
| Diff (Ctrl/Cmd+Shift+D) | Monaco diff: base (left, read-only) vs. current (right, editable) |
| Compare live | Fetch today's live file (pretty-printed if minified) and diff it against the override |
| Match row | Choose exact/glob/regex, edit the pattern, toggle ignore-query, Apply. Invalid regexes are rejected, and a pattern that no longer matches the source URL asks for confirmation |
| Build-hash hint | If the file name contains a build hash, offer a one-click glob (`main.3f9a1c2b.js` → `main.*.js`, `index-BkT3x9aQ.js` → `index-*.js`) |
| Explorer | Overrides (switch on/off, hit counter, ⚠ upstream changed, context menu) and page resources as a tree (origin → folders → files, served-from-override dot, iframe badge); scripts and stylesheets expand to the original files of their source map (root → folders → files, third-party code under a closed **Libraries**; §6.7). A filter box covers both, including iframe URLs and loaded originals (a bundle with matching originals is listed, open). The tree is virtualized and keyboard-navigable over all rows; resource events are applied once per animation frame (every 250 ms while the window is hidden), so pages with thousands of files stay smooth |
| Original sources | Open read-only from the Explorer or the palette: a tab of their own after the file tabs, a header with a **Read-only** badge, where the file comes from and **Go to bundle code**, and Monaco's read-only message when typed into. Save, pretty-print and diffs don't apply. An original the map has no text for says so, and offers its bundle code |
| Go to bundle code / Go to original source (Ctrl/Cmd+Shift+M) | From a line of an original to the code it became in the bundle's tab (opened as usual: pretty-printed, or the override that applies), or from the cursor in a script or stylesheet tab to the original line. Header buttons, the editor's context menu, **View** menu and palette. Exact through pretty-printing and outside your edits; inside them, or where a new build changed the file, a toast says why a jump landed short or couldn't be made |
| Command palette (Ctrl/Cmd+K or P) | Fuzzy search over every page file, the original files of loaded maps, overrides and actions; the list refreshes while open as files arrive |
| Layout | Sidebar and preview are fitted to the window (the editor keeps at least 240 px; panel minimums give way below that, e.g. when zoomed in). Hiding the preview takes the native page view out of the window with it. Visibility and sizes are saved on every change |
| Large files | Scripts, stylesheets and HTML over 1 M characters open in a lite mode: syntax colouring only (Monarch grammars, no language service or validation, folding, minimap or bracket colourization), shown as "Large file" |
| Focus | Opening or switching tabs (original sources too) focuses the editor; closing a tab from the keyboard, typing in a field or arrowing through the Explorer never has focus pulled into the code |
| Workspaces | The rail lists them below Explorer and Search: a tile each (site favicon or the name's first letter, on the workspace's colour), the active one marked, + to add one. Clicking another tile switches to it (§5.1); clicking the active one opens a popover to rename it and pick its icon and colour, applied as you change them; right-click for the same, or to delete it. The tooltip shows the name and the page title. The palette lists them too |
| Close with unsaved edits | Closing a tab asks first. Closing the app keeps every unsaved edit as a draft and reopens it next time, with the tabs and the last page (see §5, Session restore) |
| Menu | App menu replaces Electron's default, so Ctrl/Cmd+R reloads **the site**, not the editor. Undo/redo/select-all are routed to Monaco. Page DevTools: Ctrl/Cmd+Shift+J; editor DevTools: Ctrl/Cmd+Alt+I. Ctrl/Cmd+B toggles the sidebar. **View › Go to Original Source or Bundle Code** (Ctrl/Cmd+Shift+M) jumps whichever way applies, and says so on other tabs |

## 8. Security

- Editor window: `contextIsolation`, `sandbox`, a strict CSP (`script-src 'self'`), no navigation, no pop-ups. It sees only `window.consoleEditor`.
- Site view: no preload, sandboxed, separate persistent session partition (`persist:site`). It cannot reach IPC, and every IPC handler also checks that the sender is the editor window.
- Site permissions (`sitePermissions/`): Electron grants everything when a session has no handler, so the site session denies by default. Fullscreen, sanitized clipboard writes and pointer lock are granted; camera/microphone, location, notifications, clipboard reads, MIDI and launching other applications ask with a native dialog naming the requesting origin (remembered until quit; launching an app is asked every time); everything else is denied.
- Pop-ups: `window.open` pop-ups (sign-in flows need `window.opener`) open as child windows without interception; links meant for a new tab load in the page view, where overrides apply.
- A page's `beforeunload` guard cannot block reloads or navigation: editor-initiated reloads after a save must win, and Electron would cancel them without showing a dialog.
- **Trade-off:** Chromium's Local Network Access checks are disabled for the whole app (feature switches are process-wide), because documents served through `Fetch.fulfillRequest` have no address space and would otherwise be blocked from reaching localhost/intranet hosts (§6.5). Any page opened in the app can therefore reach local-network addresses, as in Chrome before these checks shipped. Browse only sites you are working on.
- Packaged builds flip Electron's fuses: `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` and the `--inspect` switches are ignored, the app loads only from its `app.asar`, whose integrity is checked on macOS and Windows, and the site view's cookies are encrypted with the OS keystore (not yet on macOS: an ad-hoc signed app would be asked for the Keychain password after every update). `file://` keeps its extra privileges because the editor UI and its module workers load from it.
- Packaged builds drop `--remote-debugging-port`/`--remote-debugging-pipe` when the data folder is the default one (compared after resolving links, so pointing `CONSOLE_EDITOR_USER_DATA` at it doesn't count as another), as Chrome does for its default profile: otherwise any local program could start the app with a port and read the site view's logins.
- One instance per data folder (`app.requestSingleInstanceLock`), so two processes never write the same overrides and session files. A second launch hands its URL to the running window and exits; if the first is still starting, that URL replaces the one it was about to open. On macOS, where Finder and `open` reopen the running app instead of starting a second process, the app also takes URLs from `open-url` the same way (following Electron's documentation; not yet checked on a Mac). Runs from source use a separate `… (dev)` data folder, so they never share one with an installed copy.
- IPC inputs are type-checked; matchers are validated before storage; settings are filtered to known boolean keys. Source-map calls take only an http(s) bundle URL: main derives the map URL itself.
- Original sources are only ever shown as editor text, and their names (which the page chooses) as plain labels with control characters removed.
- The site sees a standard Chrome user agent (Electron tokens removed).
- All data stays local: nothing is uploaded, and there is no telemetry. Besides the page and out-of-page fetches for the files you open and for the page's favicon (from the site shown, through its session; kept only if its bytes are an image, and shown as an `<img>` data URL, where SVG can't run scripts), the source maps of the page's scripts and stylesheets when you ask for them (§6.7: http(s) through the site's session, with cookies only for the bundle's or the page's origin; `data:` maps decoded locally; any other scheme refused; 64 MB, 30 s), the only other network calls are the update check (GitHub's releases API and the release's CHANGELOG.md at its tag) and, when you ask for it, the update's download. **Settings › Check for updates** turns the automatic check off.
- Updates are verified before they are installed: electron-updater checks the SHA-512 in the release's `latest*.yml`, and manual downloads are checked against the release's `SHA256SUMS.txt` before they are kept. Both come from the same GitHub release, so this guards against damaged downloads, not a compromised release; signed builds would add that (§11). Release notes are Markdown rendered with `marked` and sanitized with DOMPurify (no images, styles, forms or frames), and their links open in the default browser (http and https only). `CONSOLE_EDITOR_UPDATE_FEED` (a local update server, for tests) is honoured only with a data folder of its own, like the debugging port.

## 9. Testing

| Layer | What | Command |
|---|---|---|
| Unit | Matchers, header/SRI/source-map transforms, stores (persistence, atomic concurrent writes), engine logic and navigation rules with a fake CDP transport, iframe session coordination (timeouts, sessions that go away, cascading detach), minified heuristic, version comparison, CHANGELOG parsing (and that CHANGELOG.md covers `package.json`'s version), the update service with fakes (checks, quiet failures, progress, checksums, install failures, schedule), workspaces in the stores (migration, per-workspace tabs, drafts and overrides, deletion), favicon loading (recognising images, size caps), source maps (finding the reference, loading limits, header capture) | `npm test` |
| Renderer | Resource tree building and filtering, command-palette fuzzy matching, update notifications, What's New and page tabs, session sync and workspace switching (pending drafts written, tabs closed without losing them, the other workspace's reopened), original sources (parsing, positions through pretty-printing, tabs, jumps both ways, the tree, the palette) | `npm test` |
| Architecture | Feature-Sliced Design layer rules | `npm run lint:fsd` |
| Integration | Engine in real Chromium against the fixture site: gzip, static and runtime SRI, globs, CSS/HTML overrides, 404, redeploy detection, source maps, disable. Iframes through the session-aware WebSocket transport (`test/helpers/chromium.ts`): same-site, cross-site and nested iframes, SRI inside iframes, iframe HTML overrides, same-site navigation, removal, reload; each asserts the iframe really is a separate target. Source maps named by headers, `X-SourceMap`, comments and `data:` URIs, a stylesheet's, and an override-served bundle's | `npm test` (skips if no Chromium; `npx playwright install chromium`) |
| End-to-end | Built Electron app driven by Playwright: open site, edit, save, page runs it, disable/enable, edit files inside a cross-site and a nested iframe, persistence across restart, a second launch handing over its URL, workspaces (a new one starts empty and doesn't serve another's overrides, takes its site's favicon, switching back restores the page, tabs and overrides with no history from the other, renaming, all of it across a restart). Updates against a local feed: the automatic announcement, What's New with the release's notes, a download refused for its checksum and then accepted. The original sources behind a bundle: listed, opened read-only, jumping to the pretty-printed bundle line and back, found from the palette | `npm run test:e2e` (on headless Linux: `xvfb-run npm run test:e2e`) |
| Packaged | The installed app (asar, fuses, signature) fixes the demo store's checkout through the UI, driven over `--remote-debugging-port` since the fuses disable Node's inspector. The release workflow runs it on six runners, one per architecture: macOS (from the disk image), Windows (after a silent install; the x64 runner also checks that the ARM installer refuses it) and Linux (from the installed `.deb`, with Ubuntu's user-namespace restriction left on) | `npm run test:packaged -- <app>` |
| Update | An installed app updates itself to a build one patch higher, served by a local stand-in for GitHub: the notification, What's New, the download, **Restart to update**, the restarted app running the new version (and What's New after it). The release workflow runs it for the Windows installers (then uninstalls, checking the updater's cache goes too) and the AppImages on their four runners. The `.deb` path (as root, through `sudo`, and with the password refused) and the AppImage installing on quit were checked by hand | `npm run test:update -- <app> <newer dist>` |

## 10. Packaging and releases

`electron-builder.ts` configures electron-builder; `npm run dist` builds the current system's installers into `dist/`. electron-vite bundles everything the app runs, dependencies included, into `out/`, so the package holds only `out/` and `package.json` (about 26 MB before Electron itself).

| System | Installers | Notes |
|---|---|---|
| macOS | `.dmg`, Apple silicon and Intel | Signed ad hoc unless a Developer ID certificate is configured (`CSC_LINK`/`CSC_NAME`): Apple silicon refuses unsigned code. Hardened runtime with JIT, camera, microphone and location entitlements (also for the helpers, where Chromium captures media) and the matching usage descriptions, without which macOS ends the app when a site asks. Not notarized, so Gatekeeper asks on first launch, and since an ad-hoc signature changes with every build, each new version is asked about again (as are sites' camera, microphone and location permissions) |
| Windows | NSIS installer per architecture (x64, ARM64), built in one run so `latest.yml` lists both | Per-user or per-machine; the app sets the same AppUserModelID as its shortcuts. `build/installer.nsh` makes the ARM64 installer refuse an x64 PC (electron-builder would otherwise leave shortcuts to nothing), and removes `%LOCALAPPDATA%\console-editor-updater` on uninstall but not when an update runs the old uninstaller: it holds the installer copy differential updates start from, and the new installer may be running from it. Unsigned, so SmartScreen may warn, and Smart App Control blocks it |
| Linux | AppImage, `.deb`, `.rpm`, `.tar.gz`, x64 and arm64 | `desktopName` names the `.desktop` file and Electron's window class, so docks match the window to the launcher. The `.deb`/`.rpm` install an AppArmor profile, which Ubuntu 24.04+ requires for Chromium's sandbox, and depend on ALSA and GBM too (Electron links them; electron-builder's defaults leave them out). The `.rpm` has no `/usr/lib/.build-id` links, which would clash with other packages built on the same Electron. The AppImage keeps the sandbox on (electron-builder's default desktop entry turns it off) and uses electron-builder's stable runtime, which needs FUSE 2 (`libfuse2`) |

`.github/workflows/release.yml` builds on macOS, Windows and Linux runners after the CI checks. It then installs the disk images, Windows installers and `.deb` packages the way a user would, each on a runner of its own architecture (Apple silicon and Intel Macs, Windows x64 and ARM, Linux x64 and arm64), runs the packaged smoke test against the installed app, updates the installed Windows app and the AppImage to a build one patch higher (§9), and drafts a GitHub release with the updater's `latest*.yml` and block maps and `SHA256SUMS.txt`. The release's notes start with its `CHANGELOG.md` section (`scripts/release-notes.ts`); the workflow refuses to build a release that has none. It runs on a `vX.Y.Z` tag matching `package.json` or by hand (optionally drafting the release, whose tag is created on publishing). Signing and notarization are not set up yet.

### 10.1 Updates

`UpdateService` (main process) checks 10 seconds after start and every 6 hours while **Check for updates** is on, and on demand (**Help › Check for Updates…**, the command palette). It reads `releases/latest` from GitHub's API (published releases only: drafts and pre-releases are never offered) and compares the tag with the running version. For a newer one it fetches that tag's `CHANGELOG.md` and offers the update with its section as notes. Automatic checks fail quietly (offline, rate-limited); a manual one says why.

How an update installs depends on how the app was installed, decided once and lazily:

| Installed from | Detected by | Update |
|---|---|---|
| Windows installer | a packaged app on Windows | electron-updater's `NsisUpdater`: downloads the installer for the running architecture from `latest.yml` (differentially against the installer copy the last install kept, when the release has block maps), verifies its SHA-512, and runs it silently with `--updated --force-run` on **Restart to update**, or silently on quit |
| AppImage | `APPIMAGE`, set by the AppImage runtime, when the executable is inside that runtime's `APPDIR` (programs started from another AppImage inherit its variables) | `AppImageUpdater`: downloads only the changed blocks (the AppImage embeds its block map), then replaces the file, on restart or quit. A file named with its version is replaced by one named with the new version |
| `.deb`, `.rpm` | `dpkg-query -S` or `rpm -qf` on the executable | `DebUpdater`/`RpmUpdater`: downloads the package; **Restart to update** installs it with one password prompt (`pkexec` through the desktop's polkit agent, or `gksudo`/`kdesudo` where installed) and restarts. The `.deb` goes through one elevated shell: `dpkg -i`, and if that fails, `apt-get install -f` (new dependencies) and `dpkg -i` again, so a failure other than dependencies is still reported (electron-updater would ask twice, and restart into the old version when `apt-get` found nothing to do). The `.rpm` uses `zypper`, `dnf`, `yum` or `rpm`, whichever comes first. Without a prompt helper electron-updater falls back to `sudo`, which can't ask without a terminal: the install fails and says so. Not on quit: a password prompt while quitting would surprise. A refused password leaves the app running and says so |
| macOS disk image, `.tar.gz` | anything else | The release's `.dmg` (for the Mac's own architecture, also under Rosetta) or `.tar.gz` is streamed to Downloads, checked against `SHA256SUMS.txt` (kept only when it matches), then opened (`.dmg`) or shown in its folder. macOS can't install in place until the app is signed with a Developer ID (Squirrel.Mac requires it) |

Builds run from source don't check for updates, except with `CONSOLE_EDITOR_UPDATE_FEED` and a data folder of their own (the e2e tests), where they take the download path.

The package manager is asked rather than electron-builder's `resources/package-type` marker: the `.deb` and `.rpm` are built side by side from one folder, so the marker can name the other package, or end up in the AppImage and `.tar.gz`. Before restarting, the app asks the renderer to write unsaved edits as drafts (the same handshake as closing the window), so the session comes back in the new version.

`update.json` in the data folder records the last version run. When it differs from the running one, the app has just been updated and opens **What's New**: a page tab (not a file; saving, formatting and diffs ignore it) listing the bundled `CHANGELOG.md`'s released sections, with the offered update and its download state above them. Version 0.1.0 kept no record, so a data folder of its with no `update.json` counts as an update from 0.1.0.

## 11. Milestones

**M1: MVP (done).** Everything marked ✅ above.

**M2: Robustness and sharing**
- ✅ Iframes, including cross-site and nested ones (§6.5).
- Workers: add `worker`/`service_worker` to the auto-attach filter, with an engine option that skips the Page domain.
- Watch `workspace/files` for external edits (edit in VS Code, the app reloads the page), with an "Open in external editor" action.
- ✅ Workspaces: a page, tabs and overrides per site or task (§5.1).
- Export/import a workspace's overrides as a zip or JSON, so a teammate can reproduce your fix.
- Response header overrides (CORS, CSP, cache) and request blocking (e.g. disable an analytics script).
- Search across all page resources (find which bundle defines a function).
- Docked/undocked page view, and responsive device presets.

**M3: Your own Chrome, and distribution**
- External Chrome mode: launch Chrome with a dedicated `--user-data-dir` plus `--remote-debugging-port`, or connect to a running one; `WebSocketTransport` implementing `CdpTransport`; one engine per tab.
- ✅ Installers with electron-builder, built and smoke-tested on all three systems by the release workflow (§10).
- ✅ Update notifications, What's New, and installing updates on Windows and with the AppImage, `.deb` and `.rpm` (§10.1).
- Signed and notarized builds, and with them installing updates in place on macOS.

**M4: Sources**
- ✅ Source-map explorer: list the original files from `sourcesContent`, open them read-only, and jump between an original line and the bundle line (§6.7).
- Research: editing an original module and recompiling only it (esbuild transform) inside a webpack/Vite bundle's module map.
- Console panel inside the app (mirror of `Runtime.consoleAPICalled`), and quick snippets.

## 12. Risks and open questions

| Risk | Mitigation |
|---|---|
| SSO providers blocking embedded browsers | Standard Chrome user agent now; external-Chrome mode (M3) as the fallback |
| Huge bundles (10+ MB) are slow to pretty-print and highlight | The formatter runs in a worker that shuts down when idle; files over 1 M characters open in lite mode (no TypeScript service); file contents cross IPC once. Measured on a 2.7 MB bundle: opens in ~1.5 s; the editor window grows from ~190 MB to ~560–600 MB, of which only ~130 MB is JS heap (the rest is Monaco's native line/token buffers and rendering). A small file costs ~125 MB, mostly the TypeScript service, loaded on first use |
| Self-verifying scripts detect edits | Out of scope; document it |
| CDP behaviour changes between Chromium versions | Integration tests run the engine against real Chromium; pin and bump Electron deliberately |
| Minified identifiers make edits hard to write | Pretty-print, and read the original sources through their source maps (§6.7) |
| Huge source maps (tens of MB) | Read only when asked for, parsed in a worker; 64 MB cap; at most 4 maps (48 MB) kept decoded, the least recently used dropped, and the worker stopped after 3 idle minutes |
