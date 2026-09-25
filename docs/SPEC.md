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
| U12b | Overrides and file listing for what workers load: dedicated, shared and service workers, and worklets | ✅ (except a nested worker's first script, §6.6) |
| U13 | Export/import a workspace's overrides to share them with teammates | 🔜 M2 |
| U14 | Use my own Chrome (existing profile, extensions) instead of the embedded browser | 🔜 M3 |
| U15 | Browse original sources from source maps (read-only) and jump to the matching bundle code | ✅ (§6.8) |
| U16 | I keep a workspace per site or task (its page, tabs, unsaved edits and overrides) and switch between them from the rail, which shows each one's favicon or a colour I pick | ✅ (§5.1) |
| U17 | I read the console of the page and every iframe in it as one stream, each row tagged with its frame, and run code in the frame I pick: send an event in one service, watch another react | ✅ (§6.7) |
| U18 | I move the website into a window of its own, to put it on another screen, and back into the editor, without it reloading; it opens where I left it next time | ✅ (§7.1) |
| U19 | I block a request (an analytics script, a slow third-party iframe) from the file tree, and the page reloads without it | ✅ (§6.3) |
| U20 | I change a response's headers (remove a CSP or X-Frame-Options, set Cache-Control), or let a page call an API cross-origin, without touching the server | ✅ (§6.3) |
| U21 | I keep the code I send to a frame as a named action and run it again with one click, from a panel or the palette, even in a cross-site iframe | ✅ (§6.9) |
| U22 | I move the Actions panel into a window of its own, keep it on top of the page or put it on another screen, and back into the sidebar; it opens where I left it next time | ✅ (§6.9) |
| U23 | I see what each frame of the page runs: its UI library, framework, state library and bundler, their versions, whether each is a production build, and how I can tell | ✅ (§6.10) |

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
    Store["OverrideStore / RuleStore / SettingsStore"]
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
- **CDP `Fetch` domain at the *response* stage.** Keeps the real upstream headers (CORS, cookies, CSP) and lets us hash the upstream body to detect redeploys. The `Request` stage would skip the network but would have to invent headers; only block rules use it, since a blocked request should never reach the server.
- **Transport-agnostic engine.** `InterceptionEngine` talks only to `CdpTransport { send, on }`. There are adapters for Electron's debugger (app) and Playwright's CDP session (tests); an external-Chrome WebSocket adapter is M3.
- **Monaco.** It is VS Code's editor: syntax highlighting, find/replace, multi-cursor, minimap and a diff editor, running in-process with no language server needed.
- **React 19 + Zustand + Tailwind v4 + Motion.** The UI outgrew hand-written DOM code once it gained a command palette, context menus, virtualized trees and animated panels. Zustand keeps state outside React (the app event bridge writes to it without a component tree) and lets each component subscribe to exactly the slice it renders. The design system (tokens, motion rules, components) is in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
- **Feature-Sliced Design in the renderer.** Layers `app → pages → widgets → features → entities → shared`, each importing only from layers below it, checked by Steiger (`npm run lint:fsd`).

## 4. Source layout

```
src/
  shared/            types/ (IPC + data model, one file per domain), constants.ts (gallery hash, env var names),
                     ipcChannels.ts (the IPC channel of each API method, for main and preload),
                     stackLibraries.ts (what the page stack can find: names, kinds, how each shows; §6.10),
                     matcher/ (URL matching), rules/ (rule validation, shared by the form and the store),
                     minified/, version/ (semver comparison),
                     changelog/ (CHANGELOG.md sections)
  main/
    index.ts         app bootstrap: data folder, Chromium switches, single-instance lock
    launch/          createWindow.ts (window, stores, controllers, updater), CloseGuard.ts (session flush on close),
                     handOver.ts (a second launch's URL), launchState.ts (the open window they share), URL and
                     data-folder helpers
    constants.ts     http(s) URL patterns, file-not-found code
    appInfo.ts       app id, repository URL and Linux names (shared with electron-builder.ts)
    PageController/  PageController.ts (WebContentsView for the site, engine and console wiring), FrameServices.ts
                     (the console and the inspector, handed each session as one observer), PageLoader.ts
                     (attach, navigate, leave), normalizeUrl.ts and view/session helpers
    PageWindow/      which window shows the site's view: the editor's, or a window of its own (§7.1)
    ActionsWindow/   the Actions panel's own window: opening, docking, Keep on top, the events its UI is sent (§6.9)
    windows/         what the app's own windows share: creating one, where it opens (placeWindow.ts), saving its
                     place, wiring its close, and its View menu check mark
    WorkspaceController/  workspaces: switching and deleting (WorkspaceController.ts), the page URL and favicon each
                     remembers (PageFollower.ts), and its title once it settles (TitleRecorder.ts) (§5.1)
    console/         ConsoleService/ (logs, errors and evaluation on every CDP session: rows, batches, handles),
                     ConsoleFrames/ (the page's frames across sessions, and their JavaScript contexts), value
                     previews (§6.7)
    inspector/       InspectorService/ (the page stack: each frame's libraries, looked at once it loads), the page-side
                     detector and React hook stand-in, and the checks on what the page answers (§6.10)
    favicon/         a page's favicon as a small data URL (sniffed, size-capped)
    sourceMap/       a script's or stylesheet's source map: found (SourceMap/X-SourceMap header or trailing
                     comment, per-kind precedence) and read out of page (http(s) through the site session,
                     data: handed over undecoded; 64 MB, 30 s) (§6.8)
    readCapped.ts    capped streaming reads (favicons, source maps)
    desktopEntry/    Linux: the desktop entry and icons an AppImage or .tar.gz installs for itself (§10)
    electronTransport.ts  webContents.debugger → CdpTransport
    engine/          PageInterception/ (one engine per CDP session: page, iframes, workers; hands each frame
                     session to the console too),
                     InterceptionEngine/ (the coordinator, with frame, navigation, resource, paused-request,
                     settings and worker-script collaborators), rules/ (block, header and CORS rules: matching and
                     header edits), transform/ (SRI/source maps/headers, the SourceMap header a response names),
                     cdp/ (transport interface), websocketTransport/ (browser-level CDP, used by tests),
                     constants.ts (CDP command and event names, HTTP status classes)
    store/           OverrideStore/, SessionStore/, RuleStore/, ActionStore/ (each a store with its file and record helpers), SettingsStore.ts,
                     WindowStore/ (an own window's place: the website's, the Actions panel's), WriteQueue.ts, writeAtomic.ts and shared sanitizers
    update/          UpdateService/ (checks, downloads, installs: §10.1), electronInstaller/ (electron-updater),
                     updateEndpoints.ts (GitHub, or a local update server in tests)
    sitePermissions/ permission policy for the site view
    chromiumFlags/   Local Network Access switches (see §6.5, §8)
    ipc/             registerIpc.ts (sender-checked handlers)
    installMenu/     the app menu, and which window its commands go to
  preload/index.ts   contextBridge → window.consoleEditor
  renderer/src/      React UI, Feature-Sliced Design (see DESIGN_SYSTEM.md §6):
    app/             entry, providers, event bridge (main → stores), styles/tokens, component gallery; the view each
                     window shows (views/: editor, gallery, website window, Actions window) and those windows' bridges
    pages/editor/    the workspace layout and its persisted layout store; session sync and workspace switching
    pages/page-window/  the website's own window: the preview alone, toolbar and all (§7.1)
    pages/actions-window/  the Actions panel's own window (§6.9)
    widgets/         title-bar, activity-bar, explorer, editor-panel, page-preview, status-bar, settings-panel, command-palette,
                     console-panel, actions-panel
    features/        open-resource (also original sources and the jumps between them and bundles), save-override,
                     format-document, compare-changes, toggle/delete-override,
                     edit-match-rule, navigate-page, filter-resources, update-settings, close-tab,
                     update-app (notifications, the What's New page, the status-bar entry), edit-workspace,
                     run-in-frame, filter-console, name-frame, clear-console, expand-console-value, detach-page,
                     rule/ (quick-actions: block or remove a CSP in one click; edit: rule pages and their form;
                     toggle; delete), action/ (a group: run, edit, detach), inspect/ (a group: stack, the Page stack)
    entities/        page, settings, override, editor-tab (+ Monaco model registry, page tabs and their drafts,
                     read-only source tabs), resource, source-map (each bundle's map state, the originals tree),
                     app-update (updater state, the bundled CHANGELOG.md), workspace (+ its rail tile),
                     frame (the page's frames, their labels and colours, finding an action's frame), console-log,
                     rule (+ hit counts and recent requests, header presets), action, page-stack (each frame's libraries)
    shared/          api (preload bridge), ui (design system), monaco, lib (format and source-map workers,
                     overlays, motion), config
test/
  unit/              matcher, transform, stores, rule validation and matching, engine and PageInterception (fake CDP),
                     minified heuristic, source maps (finding, loading, header capture)
  renderer/          resource tree building, palette fuzzy matching, session, workspaces, rules, original sources
                     (parsing, positions through pretty-printing, tabs, jumps, tree)
  integration/       engine, rules, iframe and worker sessions against real Chromium + fixture site, source maps
                     in every form
  e2e/               the built Electron app driven by Playwright
  smoke/packaged.ts  a packaged build (installed app) driven over the remote debugging port
  smoke/update.ts    an installed app updated to a newer build from a local stand-in for GitHub
  fixtures/site.ts   fixture site: gzip, SRI (static + runtime), hashed names, source maps, iframes (/frames.html),
                     every kind of worker (/workers/), and pages for rules (headersPages.ts: tracking scripts,
                     a CSP, a cross-origin API), source maps in every form (/maps.html: header, X-SourceMap,
                     comment, data: URI, a stylesheet's, HTML fallback, XSSI, a missing one); sourceMaps.ts
                     builds them, esbuildApp.ts is a checked-in esbuild build
  helpers/           Chromium launcher with the app's flags, WebSocket CDP harness
build/               app icon (icon.png 1024 px original, icon.icns macOS, icon.ico Windows, icons/ Linux sizes),
                     macOS entitlements, NSIS hooks (electron-builder's build resources)
electron-builder.ts  installer configuration
scripts/             release-notes.ts (a release's notes from CHANGELOG.md), check-structure.ts and structure/
                     (the code-structure check, `npm run lint:structure`)
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

type Rule = {             // a workspace's way of blocking requests or changing their headers: see §6.3
  id: string;             // 8 hex chars
  match: UrlMatcher;      // as an override's
  resourceTypes: ('Document' | 'Stylesheet' | 'Script' | 'Image' | 'Font' | 'Media' | 'XHR' | 'Ping' | 'Other')[];  // [] = every type
  enabled: boolean;
  createdAt: number; updatedAt: number;
} & (
  | { action: 'block' }                  // fails the request before it is sent
  | { action: 'headers'; headers: { operation: 'set' | 'remove'; name: string; value: string }[] }  // 1–32, in order
  | { action: 'cors' }                   // lets the page read the response cross-origin
);
// Each rule belongs to one workspace (`workspaceId` in rules.json); at most 200 per workspace.

interface ConsoleAction {   // code kept to run in a frame with one click: see §6.9
  id: string;             // 8 hex chars
  name: string;           // up to 60 characters
  target: string;         // the frame it runs in, by frame key: `top`, an iframe's address, `name:…` or `id:…`
  targetName: string;     // that frame's `name` attribute when picked ('' if none): the fallback when no frame has `target`
  code: string;           // up to 64 K characters, run as the console runs code
  createdAt: number; updatedAt: number;
}
// Each action belongs to one workspace (`workspaceId` in actions.json).
```

Originals opened from source maps (§6.8) are tabs of their own kind, kept apart from file tabs as pages are: they are read-only, never saved or restored, and close with the workspace.

**Storage** (`<userData>/workspace/`, written atomically via temp file + rename, one write at a time):

```
overrides.json          { version: 1, overrides: (OverrideMeta & { workspaceId })[] }   // metadata only
rules.json              { version: 1, rules: (Rule & { workspaceId })[] }
files/<id>.<js|css|html>        served content
files/<id>.base.<js|css|html>   diff base (only when it differs from the content)
actions.json            { version: 1, actions: (ConsoleAction & { workspaceId })[] }   // every workspace's, oldest first
settings.json (in <userData>)   Settings
page-window.json (in <userData>)  { detached, bounds?, maximized? }: whether the website has its own window, and where (§7.1)
actions-window.json (in <userData>)  { detached, bounds?, maximized?, onTop? }: the same for the Actions panel (§6.9)
session/session.json            { version: 2, activeId, workspaces: (Workspace & SessionState)[] }
session/favicons/<ws>.txt       a workspace's favicon, as a data URL
session/drafts/<tab>.txt        unsaved text of a tab (tab ids are unique across workspaces)
session/drafts/<tab>.base.txt   what that tab's editing started from (tabs not yet saved as overrides)
```

A version 1 `session.json` (one page and its tabs) becomes the first workspace, and overrides and rules saved before workspaces existed (or whose workspace is gone) are given to the active one at start.

**Rules on disk.** `RuleStore` writes a change to disk before it reaches memory (and so the engine); a failed write leaves the rules as they were. Entries this build can't read (a newer version's action or request type, a hand edit) are neither listed nor applied, and are written back as they were. A `rules.json` that isn't JSON of the right shape is moved to `rules.json.broken` and the app starts with no rules; one that can't be read, or moved aside, is left alone and every change is refused, so it is never written over. Either way the window says so once it opens.

**Session restore.** The main process remembers the page URL on every main-frame navigation, for the active workspace. The renderer writes the tab list 300 ms after it changes and a tab's draft 800 ms after typing pauses (the base once per tab); a draft is deleted when its tab is saved, undone back to the saved text, or closed. Closing the window runs a handshake: main sends `flush-session`, the renderer writes whatever is pending and answers `sessionFlushed(ok)`, and only then does the window close (after 5 s, or if a write failed, it asks before closing). On start, the app loads the last URL (a URL on the command line wins), then reopens each tab: an override from the store, a tab with a draft entirely from disk (no network), any other tab by fetching the file again; drafts are applied as one undoable edit, so the tab shows as unsaved and undo reveals the saved text. Tab ids are unique across runs because they name the drafts. Session syncing starts only after restoring, so a fresh start never overwrites the session being restored. Each sync run is bound to one workspace: tab lists are written with its id, and one that arrives for a deleted workspace is ignored.

### 5.1 Workspaces

A workspace is a saved workflow: a page (URL, title and favicon), the tabs open on it with their drafts, and its own overrides, rules and actions. Exactly one is active: its page is shown, its overrides and rules are the ones the engine applies (`OverrideStore.list()`, `RuleStore.list()`) and the Explorer lists, its actions the ones the Actions view lists (`ActionStore.list()`), and new ones are created in it. `get`/`update`/`remove` still reach any override or rule, so a save still running when the workspace changes lands where it began, and the renderer doesn't write its result into the workspace shown since.

**Switching** (a rail tile, or the palette) runs one at a time:
1. Renderer: if a rule page holds unapplied edits, ask first (rule pages aren't kept on disk). Wait for running saves, write what is pending (as on close, and again while edits typed meanwhile keep coming in; if a write failed, ask before going on), then, in the same task, stop the session sync and close the file tabs without deleting their drafts, and the rule pages. App pages (What's New) stay open.
2. Main (`WorkspaceController.switchTo`): load `about:blank` and clear the history, so nothing the old page does from then on (an in-page navigation, a title, a favicon) is taken for the next workspace's; make the workspace active (in memory at once, so a failed write is reported without leaving the switch half done); point the engine at its overrides and rules (`Fetch` patterns recomputed, `overrides-changed` and `rules-changed` sent); send its actions (`actions-changed`), then `workspaces-changed`; load its last page, clearing the history again once it has loaded, so Back never leads into another workspace's pages.
3. Renderer: reload the workspaces, overrides and rules, reopen the tabs of whichever workspace is now active (the old one again, if switching failed) the way a start does, and sync again (not if the tabs couldn't be reopened: the next change would write over them).

**Favicons.** On `page-favicon-updated` (the page's `<link rel="icon">`s, or `/favicon.ico`), the candidates are fetched in turn through the site's session (up to 256 KB each), recognised by their bytes (PNG, JPEG, GIF, ICO, WebP, SVG; anything else, such as an HTML error page, is skipped), and kept as a data URL: PNG and JPEG scaled down to 32 px, other types kept as they are up to 64 KB. The icon is kept for the workspace active when the page reported it, and only if that workspace is still on the same site once it has loaded; moving a workspace to another site drops its old icon. Icons travel in their own `workspace-favicon` event, so renaming (sent on every keystroke) or a new page title stays small. A title is recorded once it has stayed for a second, as some pages keep changing theirs.

**Creating** adds an empty workspace (in the first colour no other has) and switches to it, with the address bar focused; if the switch doesn't happen, the new workspace is removed again. **Deleting** asks first and removes the workspace's actions, overrides and rules (first: were the workspace to go first and this fail, the next start would hand its overrides and rules to another), then the workspace with its drafts and favicon; the active one hands over to its neighbour first, and the last one can't be deleted. The site's cookies and logins (`persist:site`) are shared by all workspaces.

**Frame names.** Each workspace keeps the names you give the page's frames in the console (`frameNames`, by frame key: `top` for the top page, else the frame's address without query or hash, else `name:` and its `name` attribute, else `id:` and its id), at most 200, each up to 40 characters.

`CONSOLE_EDITOR_USER_DATA` overrides `<userData>` (used by tests; handy for throwaway profiles).

**Settings** (all booleans; defaults in brackets): reload page after changes (saving an override; adding, changing, turning on or off, or deleting an override or a rule) [on] · pretty-print minified files on open [on] · strip SRI [on] · strip source maps from overrides [on] · disable HTTP cache [on] · bypass service workers [on] · bypass CSP [off] · record the console [on] · framework hooks [on] (§6.10) · check for updates [on].

## 6. Interception engine

### 6.1 Attach
1. Load `about:blank` into the view first (renderer-side CDP commands never answer until a renderer exists).
2. `Page.enable`, `Page.getFrameTree` (remember the main frame id), `Network.enable` with large body buffers (256 MB total, 64 MB per resource) so `Network.getResponseBody` works for big bundles.
3. Apply settings: `Network.setCacheDisabled`, `Network.setBypassServiceWorker`, `Page.setBypassCSP`, and install/remove the runtime SRI guard (`Page.addScriptToEvaluateOnNewDocument`).
4. Compute `Fetch` patterns (§6.2) and `Fetch.enable` them, or `Fetch.disable` when there are none.
5. Navigation waits for attach to finish, so the first load is never missed.

### 6.2 Which requests get paused
Only requests that could need a change are paused:
- each enabled **exact/glob** override → a precise CDP URL pattern (CDP wildcards `*`/`?` escaped in literal parts; trailing `*` when ignoring the query), at the `Response` stage;
- each enabled **regex** override → `*` restricted to the override's resource type; a script override also pauses `Other`, the type of a worker's first script and of its static module imports (§6.6);
- if SRI stripping is on and any script/stylesheet override is enabled → every `Document`;
- each enabled **rule** → its URL pattern (a regex: `*`) at its action's stage: `Request` for block rules, `Response` for header and CORS rules. Never with a resource type: CDP's type filter names differ between Chromium versions and some types can't be filtered on, so a rule's types are checked in the handler, where they can't disagree with the pattern. A URL both blocked and overridden keeps both patterns (the stage is part of the dedupe key).

Patterns are recomputed whenever overrides or rules are created, deleted, enabled/disabled or re-matched. Content-only saves, and rule edits that only change header edits or request types, don't touch patterns (both are read at request time). A service or shared worker's session gets the same patterns, plus every `Script` and `Other` request, and never `Fetch.disable` (§6.6).

### 6.3 On `Fetch.requestPaused`
The stage is told apart by the pause itself (a response status or error means the `Response` stage).

**Request stage** (block rules only; overrides are never consulted, so a URL both blocked and overridden stays blocked): the oldest enabled block rule whose pattern and request types match fails the request with `BlockedByClient`, before anything is sent. The top-level page's own document is never blocked (the page would be gone, with it the way to turn the rule off); iframe documents are. A blocked script, stylesheet or document never gets `Network.responseReceived`, so the engine lists it itself (`ResourceEntry.blockedBy`, status 0) and it stays in the tree; opening it fetches the file outside the page. Each block emits `rule-applied`. An enabled block rule whose file arrived anyway (it was in flight before the rule) emits `rule-missed` once per rule and URL until the next navigation, and the UI offers a reload.

**Response stage:**
1. Find the override for the URL: exact beats glob beats regex, then the most recently updated wins. It must answer the request's kind: documents, scripts and stylesheets are answered by an override of their own kind, `Other` (mostly what workers load as scripts, §6.6) by a script override, anything else (fetch, XHR, preload) by a script or style override. On a service worker's session, while the page bypasses service workers, only its scripts (`Script`, `Other`) are answered; its own fetches are continued unmodified (§6.6). A CORS preflight (OPTIONS with `Access-Control-Request-Method`) is never answered by an override. Find the enabled header and CORS rules that match (URL and request type); they apply oldest first, on top of whatever body is served, and each that changed something emits `rule-applied`.
2. **Override found and the upstream response is not a redirect** (3xx + `Location`):
   - if the override has `originalHash` and upstream was 2xx: read the upstream body (`Fetch.getResponseBody`), decode it (base64 → bytes → `charset` from `Content-Type`, UTF-8 fallback), hash it, and emit `upstream-changed` if it differs;
   - body = override content; Documents get SRI stripped (if on); Scripts/Stylesheets get `sourceMappingURL` comments removed (if on);
   - headers = upstream headers **minus** `Content-Encoding`, `Content-Length`, `Transfer-Encoding`, digests, `ETag`, `Last-Modified`, `Cache-Control`/`Expires`/`Pragma` (and `SourceMap`/`X-SourceMap` when stripping), **plus** `Content-Type: <upstream type or default>; charset=utf-8` and `Cache-Control: no-store`;
   - rules edit the headers last, so a rule's `Cache-Control` beats the forced `no-store`;
   - `Fetch.fulfillRequest` with status **200**. This also answers 404/5xx/network errors, so you can patch files that are missing or while the server is down;
   - remember `networkId → overrideId` so the resource list can mark the file "served from override" (one map for all of a page's sessions: a worker's file is served on one session and reported on another, §6.6; a service worker's own script paused with no `networkId` goes under the worker's target id); emit `override-served`.
3. **HTML document with SRI stripping on, or whose headers rules change**: a document enforces the CSP, `X-Frame-Options` and `Content-Type` it arrived with, and `Fetch.continueResponse` can't change those (probed: Chromium ignores them), so the document is re-served with `Fetch.fulfillRequest`. The rules' result is worked out first, so a document nothing changes is never read. One body read: `integrity` attributes on `<script>`/`<link>` are removed if stripping, and the original status, the headers minus body-specific ones, then the rules' edits. If the body can't be read, the other header edits still go through step 4 and the user is told that CSP, `X-Frame-Options` and `Content-Type` stay as the server sent them.
4. **Rules change the headers** of any other response: `Fetch.continueResponse` with the full new header list and the status, the body streaming through untouched.
5. Otherwise `Fetch.continueRequest`. Any error → continue the request first, then emit `error`, so a bug in the engine never hangs the page.

**Header rules** apply their edits in order: `set` replaces every header of that name (matched in any case) with one, spelled as given; `remove` drops them all. Headers the app frames itself (`Content-Encoding`, `Content-Length`, `Transfer-Encoding`) and ones a rule can't really change (`Set-Cookie`, stored before a rule runs; `Location`, followed by Chromium whatever the header says) are refused when the rule is written. Names are RFC 9110 tokens, values can't hold line breaks.

**CORS rules** replace upstream's CORS headers: the requesting origin (from `Origin`, else the requesting frame's) is allowed with credentials, since a credentialed request refuses `*`, and every header the page couldn't otherwise read is exposed. A preflight is allowed the method and headers it asked for, with `Access-Control-Max-Age: 0` so turning the rule off takes effect at once, and a refused one (404, 405) becomes a 204, since a failed preflight fails whatever headers it carries. Documents are never CORS-checked, so CORS rules skip them.

**Request types.** A rule's types are the names CDP's `Fetch` domain reports; `XHR` also covers `Fetch`, `Preflight`, `Prefetch` and `EventSource` (reported under either name depending on the Chromium build), `Media` covers `TextTrack`, and `Other` everything the list doesn't name.

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

Auto-attach (`AUTO_ATTACH`) uses `filter: [{type: 'iframe'}, {type: 'worker'}, {type: 'worklet'}, {type: 'service_worker'}, {exclude: true}]` on the page's session, every iframe's and every dedicated worker's. Every type Chromium pauses on start must be listed: a dedicated worker or worklet left out is still paused but never attached, so it never runs (§6.6). Rules apply on every session that pauses requests, workers' included; an iframe's document pauses on its parent's session, so blocking an iframe happens there.

**Events:** resources from cross-site iframes carry `iframeId`; `navigated` with an `iframeId` means that iframe loaded a new document (drop its entries), `iframe-detached` means the session went away (drop its entries and its descendants').

### 6.6 Workers

Dedicated workers, shared workers, service workers and worklets are CDP targets of their own. `PageInterception` runs an `InterceptionEngine` on each worker's session too, in worker mode (`EngineOptions.worker`: the worker's type, target id and script URL, whether another worker started it, and for a service worker attached again, what its last session knew). A worker's session has no `Page` domain, and only service and shared workers have `Fetch`. Behaviour below was probed in Electron 44 (Chromium 152), Chromium 141 and Chrome 153 (where they differ, it says so); `test/integration/workers.chromium.test.ts` checks the engine against real Chromium.

Where a worker's requests are paused and reported:

| Request | Paused (`Fetch`) on | `resourceType` | Reported (`Network`) on |
|---|---|---|---|
| A dedicated worker's first script | the session of the frame that started it (the page or a cross-site iframe) | `Other` | the worker's session (`responseReceived`, `requestId` = the worker's target id) |
| Its `importScripts` and dynamic `import()` | the same frame's session | `Script` | the worker's session (type `Other` / `Script`) |
| Its static module imports | the same frame's session | `Other` | the worker's session (type `Script`) |
| A nested worker's first script (a worker started by a worker) | **nowhere** in 152 and 153 (the page's session in 141) | `Other` | the nested worker's session |
| A worklet's module | the frame's session | `Script` | the worklet's session (audio) or the page's (paint) |
| A shared worker's first script | the frame's session | `Other` | only `requestWillBeSent`, on the frame's session |
| A shared worker's `importScripts` and imports | the shared worker's session (with `Fetch` on before it starts) | `Script` / `Other` | the shared worker's session |
| A service worker's own script (`sw.js`) | the service worker's session | `Other` | its session: `requestWillBeSent`, `responseReceived` (type `Script`, `requestId` = the worker's target id), `loadingFinished` |
| A service worker's `importScripts` | the service worker's session | `Script` | its session (type `Other`) |
| The scripts Chromium's update check fetched for a new version (its `sw.js`, and any imports the check fetched) | **nowhere** | — | the new version's session: `requestWillBeSent` and `responseReceived`, type `Other`, under request ids other than its target id |
| A service worker's own `fetch()`, and pages it proxies (bypass off) | the service worker's session | `XHR` | its session (type `Fetch`) |

A nested worker's other files are paused where its parent's are.

| Fact (verified) | Consequence |
|---|---|
| With `waitForDebuggerOnStart`, a dedicated worker or worklet left out of the auto-attach filter is paused but never attached, so it never runs. Chromium 141 stalls service workers that way too; 152 and 153 don't | The filter lists every worker type (§6.5). Before, it listed only iframes, and pages' Web Workers and worklets never started |
| Dedicated worker and worklet sessions have no `Page` and no `Fetch` domain ("wasn't found") | What they load is served by the engine of the frame's session; theirs only lists the files and reads them |
| A worker attaches (`waitingForDebugger: true`) on its creator's session only after its first script was answered there. A nested worker attaches on its parent worker's session, and only if that session got `Target.setAutoAttach` | The frame's engine answers the first script without waiting for the worker. Each dedicated worker's session gets `AUTO_ATTACH` too |
| A dedicated worker's or worklet's file is paused (and served) on one session and reported on another | The map from request id to the override that served it is shared by all of a page's engines, so the file is still marked "served from override". Only the page's own navigation clears it |
| The page session's `setCacheDisabled` and `setBypassServiceWorker` don't reach requests workers make | Each worker's session gets them, and again when settings change: dedicated and shared workers both, service workers the cache setting, worklets neither |
| A waiting service or shared worker answers `Network.*` and `Runtime.*` only once it runs; `Fetch.enable`, `Target.*` and `Inspector.enable` answer at once. Awaiting `Network.enable` before resuming deadlocks. An installed service worker starting on a new session fetches at once, so its `Fetch.enable` must go out in the same task as the attach event | A worker is set up without awaiting anything: `Fetch.enable` first, then `Network.enable` and its settings, `Target.setAutoAttach` (dedicated) or `Inspector.enable` (service, shared), then `Runtime.runIfWaitingForDebugger`. The replies are awaited after the resume (5 s timeout), and the worker is resumed again in case a command held it back. Only a failed `Fetch` setup is reported as an error |
| Shared workers are never auto-attached. `Target.setDiscoverTargets` reports one before its first script is requested (browser-wide in Electron, so filter by `browserContextId`), and `Target.attachToTarget` attaches it (in Electron, `attachedToTarget` is dispatched inside that call). `Fetch` must be enabled before the worker starts, with at least one pattern, and never disabled afterwards, or the worker is never paused again | The page's session discovers the shared workers of its own browser context and attaches each at once. Until a shared worker's `Fetch` is on, `Other` pauses on the page's and iframes' sessions (its first script among them) wait, for at most 2 s (then it's given up on). A worker's session never disables `Fetch`, and its scripts' patterns (below) keep the list from ever being empty |
| A shared worker isn't paused as it starts, so its session may start reporting (`Network.enable` takes effect) only after its first `importScripts` went out, and then never reports that request. Another debugger attached to the page (DevTools, Playwright) resumes a waiting service worker itself, sometimes before the app's `Network.enable` took effect, with the same result | A service or shared worker's session also pauses every `Script` and `Other` request, and lists each from its pause unless the session reported it. A service worker's own script paused on its session counts as installed through it, whatever the session reports |
| A stopped service or shared worker keeps its session: `Inspector.targetCrashed`. When it starts again, `Inspector.targetReloadedAfterCrash`, and it waits until `Runtime.runIfWaitingForDebugger`. While a session is attached, a service worker never idles out | Both are resumed on `targetReloadedAfterCrash`. A shared worker ends with its last page, so its session is detached on `targetCrashed`: its next instance is discovered afresh and set up before it starts |
| A worker's target URL is its script URL before redirects; its session reports the final one | A worker's files are labelled with the final URL |
| Only the worker's own session can return a worker file's body (`Network.getResponseBody`) | `getResourceContent` reads it there, for at most 5 s (a stopped service worker answers only once it runs again), then falls back to the out-of-page fetch |
| Chromium keeps a service worker's installed scripts. Its update checks (`registration.update()`, the soft update about 2 s after a navigation of a page it controls with bypass off, the daily check; the app's own reloads bypass the cache, and Chromium hands such a load to no service worker, so none follows them) fetch `sw.js` and its imports paused on **no** session, and reinstall the live scripts. With the page bypassing service workers (the default), reloads never fetch its scripts again, so an override made after the install never reaches it; unregistering it and reloading makes the page's `register()` install it afresh, through interception | The app unregisters an outdated service worker before its reloads (below). On a service worker's session, a response for the worker's own script URL is its first script whatever its request id (listed once). A script listed on that session but never paused on it came from an update check: when an override matches it, it's reported (`service-worker-update`) and the new version counts as outdated |
| A new service worker version that Chromium creates before fetching its script (seen with bypass off, at a navigation's start) has that script paused with no `networkId`; its session reports the script under the worker's target id | A service worker's own script served with no `networkId` is remembered as served under the target id, so it's marked "served from override" and not reported as missed |
| Leaving a site detaches its service worker's session; coming back attaches the same worker (same target id) on a new session, started from its installed scripts, which aren't fetched again | When a service worker's session goes away, what it learnt (its script URL, whether it installed through interception, the override version each script was served, the scripts it listed) is kept by target id, for the last 50 service workers; not for one the app unregistered, and not once the page's interception is detached. The same target's next session starts from it and lists those scripts again, their bodies read with the out-of-page fetch |
| A service worker's own fetches (a precache's `cache.addAll`, say) are paused on its session as `XHR`, like the page requests it answers with bypass off. What it stores in Cache Storage outlives the override | While the page bypasses service workers, a service worker's session answers only its scripts (`Script`, `Other`) and continues everything else unmodified, so no edit is cached. With bypass off its fetches are served (they may answer the page) |
| `ServiceWorker.unregister` with a registration's scope, on the page's session, works while the worker is stopped; `self.registration.unregister()` evaluated in a stopped worker gets no answer. After an unregister, Chromium keeps the version running as long as a debugger is attached to it | The page's session enables the `ServiceWorker` domain (not awaited) and maps each version's target id to its registration (`workerVersionUpdated`) and each registration to its scope (`workerRegistrationUpdated`). An unregistered service worker's session is detached (`Target.detachFromTarget`), which lets it stop and drops its files. If Chromium attaches it again, it's only resumed |
| With the page bypassing service workers, the first page load after a restart can't reach a service worker installed in an earlier run: `navigator.serviceWorker.ready` never resolves, and the worker isn't attached. The next load of the page can. Starting the worker or updating its registration (`ServiceWorker.startWorker`, `updateRegistration`) before the first load doesn't help; unregistering it does. Plain Electron does the same with no app code: a debugger session that sends only `Network.enable` and `Network.setBypassServiceWorker`, then loads the page | Not worked around: unregistering every stored service worker on each run would drop the sites' push subscriptions. Documented as a limitation |
| Commands in flight to a worker session that goes away never settle. Old worker sessions detach on reload; workers under a cross-site iframe get no detach when that iframe's session goes away | As for iframes: in-flight commands are rejected, and removal cascades through the recorded parents, emitting `worker-detached` for each worker |

**Files workers load.** An entry reported on a worker's session carries `worker: { type, url }` (the worker's script URL; a worklet's is the URL of the document that added it) and `workerId` (the session id), and never `frame`. A worker loads no documents or stylesheets: Network type `Script`, or `Other` with a JavaScript MIME type (`importScripts`), is listed as a Script. A worker's own first script is listed from its `responseReceived` (on a service worker's session, the response for its script URL, under whatever request id), once; `loadingFinished` is the fallback when none comes, and `Inspector.workerScriptLoaded` when its session never fetched it (an installed service worker, or a shared worker whose script its page fetched). A service or shared worker's scripts are also listed from their pauses, and a service worker attached again lists its last session's scripts at once (above). A file a service worker answered for the page (`fromServiceWorker`) is never reported as missed on the page's session: it was served, or not, on the worker's. Its content is read with the out-of-page fetch (§6.7). `worker-detached` means the session went away (terminated, its page left, a new service worker version took over, or the app let go of a service worker it unregistered): drop its entries and its descendants'. A top-level `navigated` keeps the entries of service and shared workers, which outlive the page (the main process keeps listing them until `worker-detached`); dedicated workers' and worklets' go with the page. When several sessions list one URL, the page's entry wins, then an iframe's, then a worker's.

**Reloading after a service worker's scripts change.** `PageController.reload()` and `navigate()` first call `PageInterception.prepareReload(url)` with the page they load. A service worker whose scripts were served other override versions than would be served now (an override of one of them added, changed or turned off since it installed, or a script the update check reinstalled while an override matches it: `InterceptionEngine.isOutdated()`) is unregistered, with a 2 s timeout: through `ServiceWorker.unregister` with its registration's scope on the page's session, or, when the scope isn't known, with `self.registration.unregister()` evaluated in the worker. Once that succeeds, the worker is marked retired and its session detached (above); one whose registration is already deleted is let go the same way without unregistering, since its scope may hold a newer registration. One that failed or timed out is tried again on the next reload. The reload then lets the page's `register()` install it afresh, through interception. A service worker attached again after the page left its site and came back knows what its last session knew (above), so that reload leaves it installed while it's up to date. One whose session went with the page it left is judged from that knowledge too, when the page loaded is on its site: switching workspaces leaves the page for a blank one before the other workspace's overrides replace these, so a service worker of the site that runs this workspace's edits is unregistered by its scope before that workspace's page loads, and the page installs it with that workspace's version on that same load. Without a known scope it's left to its next session. One installed before any session of this run saw it (in an earlier run) may run edits of any of its site's scripts, and what it imported is unknown: it counts as outdated while its site has script overrides (turned-off ones too), so after an app restart the app's first reload with it running installs it afresh (the registration's push subscriptions are lost), and from then on it's tracked exactly. The app's own reloads (after a save, the Reload button, Ctrl/Cmd+R) and the navigations it starts do this; back, forward and the page's own navigations don't.

**Missed overrides** (§6.7) carry a `reason` for workers:
- `nested-worker`: a nested dedicated worker's first script wasn't served. Nothing can pause it in Chromium 152+, so the UI says the override can't apply there (the files that worker loads still get overrides) and offers no reload. Every page load reports it again; the UI says it once per version of the override.
- `service-worker-update`: a script listed on a service worker's session wasn't served and was never paused on that worker's sessions. Installing through them pauses every script an override matches, so Chromium's update check fetched it and reinstalled the live one. The UI offers a reload, which reinstalls your version, and says that with **Bypass service workers** off Chromium checks after every page load. A script that was paused there but not served (its override was turned on meanwhile) is reported without a reason.

**Limitations**
- A nested worker's first script can't be changed in Electron 44 (Chromium 152+); what it loads can. Reported as above.
- A service worker's edited scripts take effect on the app's reload, which unregisters it: that needs the page to call `register()` on load, and the registration's push subscriptions are lost. After an app restart, the app's first reload with a site's service worker running does this whenever the site has any script override, even one turned off (above).
- Chromium's update checks, which interception can't reach, restore a service worker's live scripts: the page's own `registration.update()` whatever the settings, and with **Bypass service workers** off also the soft update within seconds of a navigation. That's reported, and the app's next reload puts the edit back.
- With **Bypass service workers** off, requests a service worker answers from Cache Storage are never paused, copies it cached while an override was on keep the edit until it caches them again, and HTML overrides don't apply to navigations it proxies (they are `XHR` on its session).
- With **Bypass service workers** on (the default), the first page load after a restart doesn't reach a service worker installed in an earlier run (above); from the next load on it does, and the app intercepts it.
- Over a remote Chromium connection (the integration tests), a shared worker can start before its session intercepts unless its first script is overridden (and so held). In the app the attach happens inside the discovery event, before the worker starts.

### 6.7 Resource list
- `Network.responseReceived` with type Document/Script/Stylesheet (not `data:`/`blob:`/internal URLs) → entry `{ url, kind, mimeType, status, overrideId?, blockedBy?, frame?, iframeId?, worker?, workerId? }`; blocked files are listed from the pause instead (§6.3). `frame` (URL and depth) marks files loaded inside an iframe; an iframe's own document is labelled with its new URL. Workers' entries follow §6.6.
- **Navigations reset the list when they commit, not when they start.** A main-frame document request (`requestId === loaderId`) only marks a navigation as pending. Until `Page.frameNavigated` commits it, late responses of the old page are not listed, and the new document's own response is held. On commit the list is cleared (except service and shared workers' files, §6.6), `navigated` is emitted, then the held document is listed. A navigation that never commits (a download, a 204, a cancelled load: `Page.frameStoppedLoading` with nothing committed) leaves the list as it was. A commit without a request (back/forward cache, `about:blank`) resets the list too. Each iframe session applies the same rules to its own root frame and tags its `navigated` event with its `iframeId`.
- **Missed overrides:** an enabled override whose URL arrived without being served (it was enabled after the request, or an iframe loaded it on no session, §6.5) emits `override-missed` once per override and URL until the next navigation; the UI offers "Reload page". For a worker's file it may carry a `reason`, and the UI says why instead (§6.6).
- **Content for the editor:** for files served from an override or blocked, and files a service worker answered (`fromServiceWorker`: it may have been served an override on its own session), re-fetch upstream out-of-page (session cookies included) so the edited copy is never mistaken for the original. Otherwise try `Network.getResponseBody` (on the worker's own session for a worker's file, §6.6), then `Page.getResourceContent`, then the out-of-page fetch. The result carries a sha256 hash (becomes `originalHash`), and the `SourceMap` (else `X-SourceMap`) header the response named, if any. For a file served from an override that is the upstream response's header, taken at `Fetch.requestPaused` before the override replaces the response (and its header, when source maps are stripped); like the override that served it, it's shared by a page's sessions.

### 6.7 Console

The console records the page's and every frame's logs as one stream and runs code in any frame (`src/main/console/`). It rides on the sessions interception already has: `PageInterception` hands each frame's CDP session to a `SessionObserver` (the page's once attached, an iframe's while it is still paused, within the same setup budget), so a service's first log line is caught. Worker sessions aren't handed to it: a waiting service or shared worker answers `Runtime` commands only once it runs, and it must be resumed at once (§6.6). The observer's failures never touch interception.

| What | How |
|---|---|
| Recording | Per session: `Page.getFrameTree` (seeds its frames), then `Runtime.enable` and `Log.enable`. Off in Settings: `Runtime.disable` and `Log.disable` on every session, and no frames are listed |
| Frames | Keyed by frame id, which survives a move to another process (a new session). A session hosts its root frame and its same-site descendants; `Page.frameNavigated` and each frame's main-world context (`executionContextCreated` with `isDefault`) say where a frame runs now. A frame removed from its parent (`frameDetached`, not `swap`) goes with the frames in it; a session that goes away takes the frames it hosted |
| Rows | `Runtime.consoleAPICalled` (format directives filled in, `%c` dropped; the stack for errors, warnings, `trace` and `assert`), `Runtime.exceptionThrown` (uncaught errors and rejections), `Log.entryAdded` (the browser's own messages: failed requests, CSP, interventions), each on the frame of the context it came from (`Log` has none: the session's own frame). A frame loading a web page adds a divider row. What Electron's own scripts log in the page (`node:electron/…`, its security warnings in builds run from source) is left out |
| Values | A preview per value (`{sku: 42}`, `[1, 2, …]`, `Map(1) {a => 1}`, an error with its stack), and a handle for objects: `getConsoleProperties` lists one level with `Runtime.getProperties`, on the session the value came from |
| Running code | `Runtime.evaluate` on the frame's session, in its main world by `uniqueContextId`, with `replMode` (top-level `await`, redeclaring `let`), `includeCommandLineAPI` (`$0`, `copy()`), `awaitPromise` and `userGesture`. The code and its result (or what it threw) are rows too |
| Limits | The last 5,000 rows are kept (`MAX_CONSOLE_ENTRIES`) in the main process and the panel; a row's handles go with it. Clearing drops the rows and frees the page-side values (`Runtime.discardConsoleEntries`, `releaseObjectGroup`) |
| Delivery | Rows and frame changes go out every 50 ms at most, frames first (`frames-changed`, `console-entries`), so ten chatty services don't flood IPC; `listFrames` and `getConsoleEntries` give a (re)starting renderer the current state |

**Panel** (under the editor, `Ctrl/⌘+J`): the rows with time, frame chip, value previews that open in place, stacks, and the source as `file:line`, which opens the file in an editor tab. A row after code you ran shows how long after it came (`+4ms`). Frame chips filter by frame (with each frame's error and warning counts), a menu by level (as DevTools: verbose off by default; code you ran and page loads always show), a field by text. When the top page loads another page the rows before it go, unless **Keep rows** is on. The prompt runs code in the picked frame; Up and Down go through what you ran in this workspace. Frames are labelled by the name you gave them (per workspace, §5.1), else their `name` attribute, else their host and first folder; frames that would read the same are numbered. A frame's colour comes from its key, so a service keeps it across reloads and runs.

### 6.8 Source maps

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

### 6.9 Actions

An action is code kept to run in a frame of the page with one click: an event sent to one service, to watch another react. It runs the way the console runs code (§6.7): `Runtime.evaluate` in the frame's own main world, on its own session. That reaches cross-site iframes, which the page itself can't: from the top page, `window.top.frames['cart'].addItem()` throws a `SecurityError` when `cart` is on another site, and only the few members a browser allows across origins, such as `postMessage`, get through (checked in `test/integration/console.chromium.test.ts`). So an action names the frame it runs in, and calls `addItem()` there. Its code and what it gives back are console rows like anything else run in a frame.

| What | How |
|---|---|
| Its frame | A frame key (`frameKey`, as the console's picker and frame names use), and the frame's `name` attribute as it was picked. Found at each run: the frame with that key, else an iframe with that `name` (its service moved to another path); of several, one that can run code. With none, the action doesn't run, and says its frame isn't on the page |
| Storage | `ActionStore` (main process): `actions.json` in the workspace folder, each action in one workspace (§5.1). It checks what it is given (a name of up to 60 characters, a frame, code of up to 64 K characters) and drops what a corrupt file holds that isn't an action. A change takes effect once it is written, one at a time, and each sends `actions-changed` with the active workspace's list, which the renderer mirrors |
| Needs | **Record the console**: the frames and their JavaScript contexts come from it. While it is off, the view says so and offers to turn it on |

**Panel** (the **Actions** view on the rail): the workspace's actions, each with its frame's chip (dimmed while no frame on the page is it). Pressing one runs it; its last result shows under it: what it gave back, what it threw, or why it couldn't run (the first line of each value; all of it on hover). Pressing it again while it runs does nothing. **+** opens a form with its name, a frame picker (the page's frames, labelled as in the console; the one picked shows even while it isn't on the page) and its code: Enter in the name or Ctrl/⌘+Enter in the code saves, Esc cancels. A row's hover button edits it, in place; its context menu also runs, duplicates, copies the code or deletes it (after asking). A field filters by name and code. In the console, a row of code you ran has **Save as action** on hover: it opens the view on a new action with that code, for that frame, named after its first line. The palette lists the actions under **Run action**, with **New action…**.

**In its own window** (`ActionsWindow`): the panel's header, the View menu (**Actions in Their Own Window**) or the palette moves it into a window of its own, to keep beside the page or put on another screen; the same button, the menu, the sidebar's notice or closing the window puts it back. It is the same panel: the window loads the editor UI with `#actions-window`, which renders it alone, fed by its own slim bridge (`startActionsWindowBridge`: the settings, the workspaces, the page's frames, the actions, and where the panel is).

- **Events:** the main process sends the window only the events its panel shows (`ACTIONS_WINDOW_EVENTS` in `src/shared/constants.ts`: `actions-changed`, `actions-window`, `frames-changed`, `settings-changed`, `workspaces-changed`), and the window has a handler for each, so one added to the list fails typecheck until it is handled. `settings-changed` goes to both windows after any window changes a setting, so **Turn it on** in the window (recording off) turns it on in the editor too. The editor hears `actions-window` to swap its list for a notice while the panel is out (a form opened in the editor, from the console or the palette, still shows there).
- **IPC:** its UI may list frames, run code and expand what that returns, list, make, change and delete actions, read the workspaces and the settings and change them, and dock the panel or keep it on top; only the editor opens it.
- **Where it opens:** as the website's window does (§7.1), with its own `actions-window.json`: where it was last, else on a screen other than the editor's when there is one, else on the editor's, centred, 420×640 at most. It has no parent, so it moves on its own; **Keep on top** (its header's pin) keeps it above every window instead, and is remembered for the next time it opens.
- **Coming back and quitting:** closing it docks the panel; quitting keeps it where it is, and the next start opens it again once the editor has loaded. It goes when the editor's window closes.
- **Commands:** the app menu belongs to it too. Editor commands pressed there bring the editor forward first (§7.1); undo, redo and select all act on its fields.

### 6.10 Page stack

The page stack is what each frame of the page runs: its UI library, framework, state library and bundler, with versions and builds where the page tells them. It is the first part of a component inspector ([research](INSPECTOR_RESEARCH.md)). `InspectorService` (`src/main/inspector/`) rides on the sessions interception has, as the console does: `FrameServices` hands each session to both. It runs its code where the console's frames and main-world contexts say, so it needs **Record the console**, as actions do (§6.9).

| What | How |
|---|---|
| When a frame is looked at | `DETECT_DELAY_MS` (1 s) after its `Page.frameStoppedLoading`, so the frameworks have mounted; a frame that reports loading again restarts the wait. **Scan again** looks at every frame at once, as does turning **Record the console** on (after the console knows the frames' contexts). A frame's stack goes when it navigates or is removed, or its session goes; one answer that comes back after its frame loaded another document is dropped |
| Looking | One `Runtime.evaluate` of `DETECT_SOURCE` in the frame's main world, by `uniqueContextId`, with `returnByValue` and `silent` (no console row; an exception is neither reported nor paused on), within 5 s. Each check stands alone, so a page whose getter throws loses only that check. It looks through the first 2,000 elements for framework keys |
| What it checks | React: a renderer on the DevTools hook (version, `bundleType`), else React's keys on elements (`__reactFiber$…`, `__reactContainer$…`, `__reactInternalInstance$…`: a development build's fibers carry `_debugOwner`). Vue 3: `__vue_app__` on the `[data-v-app]` element (version; `app._context.reload` exists in development builds only), with Pinia and Vuex from its global properties. Vue 2: `__vue__` on an element (the version through the root's constructor chain; a development build renders through a `Proxy`). Angular: `[ng-version]` (a development build publishes `window.ng.getComponent`). AngularJS, Svelte 5, Lit and jQuery by their globals; Next.js (`__NEXT_DATA__`, `__next_f`, `next.version`), Nuxt, Remix, React Router, Gatsby and Astro by their globals or root elements; MobX and Apollo Client by their globals; webpack (`webpackChunk…`, `webpackJsonp`), Vite's dev server (`/@vite/client`), Parcel and Turbopack. Pinned in `test/integration/stack.chromium.test.ts`; the frameworks' facts were probed in real builds ([research](INSPECTOR_RESEARCH.md) §2) |
| What is kept | The page's main world answers, so its answer is checked like any input (`toStackHits`): only ids and signals in `STACK_LIBRARIES` (`src/shared/stackLibraries.ts`), at most one per library and 40 in all, a build of `production` or `development`, and a version only if it looks like one (`[\w.+-]`, up to 40 characters). Names and evidence are the app's own text from that table |
| Framework hooks | React hands its renderer (version, build) to a DevTools hook it finds as it loads, production builds too, and nothing else in a page says which React it is. While **Framework hooks** is on, every session gets `REACT_HOOK_SOURCE` with `Page.addScriptToEvaluateOnNewDocument` (after `Page.enable`: scripts for new documents run only while the domain is on), before the page's own scripts: an iframe's session is still paused when it gets it. It is a minimal stand-in (`renderers`, `supportsFiber`, `inject`, and no-op commit callbacks), put in only when the page has no hook (React DevTools', React Refresh's) and not enumerable. Turning the setting off takes it out of new documents; without it React is found by its keys, with its build but no version |
| Delivery | `stack-changed` with every frame's stack, the top page first, after each change; `listStacks` for a (re)starting renderer |

**UI.** The status bar names the UI libraries the page runs, each once, the top page's first (**Vue · Angular**); it opens the **Page stack**, as does **Show the page stack** in the palette. That page tab (an app page, like What's New: it stays open across workspace switches) has a card per frame, labelled as in the console, listing its findings by kind (UI library, framework, state, bundler), each with its version, a build badge and its evidence, and **Scan again**. While the console doesn't record, it says so and offers to turn it on.

## 7. Editor behaviour

| Action | Behaviour |
|---|---|
| Open a resource | If an override matches the URL, open the override instead. Otherwise fetch the live content, pretty-print it if it looks minified (longest line > 1000 chars or average > 150), and open it as an unsaved tab marked "Live file · not overridden" |
| Save (Ctrl/Cmd+S, or **Create override**) | New tab → `createOverride({ content, base, originalHash })`. Override tab → `updateOverride({ content })` when dirty. A save requested while one runs is queued once and sends the latest text when the first finishes. Then reload the page if that setting is on. On a rule page, Ctrl/Cmd+S applies it (or creates the rule) |
| Pretty-print (Shift+Alt+F) | js-beautify in a Web Worker; one undoable edit |
| Diff (Ctrl/Cmd+Shift+D) | Monaco diff: base (left, read-only) vs. current (right, editable) |
| Compare live | Fetch today's live file (pretty-printed if minified) and diff it against the override |
| Match row | Choose exact/glob/regex, edit the pattern, toggle ignore-query, Apply. Invalid regexes are rejected, and a pattern that no longer matches the source URL asks for confirmation |
| Build-hash hint | If the file name contains a build hash, offer a one-click glob (`main.3f9a1c2b.js` → `main.*.js`, `index-BkT3x9aQ.js` → `index-*.js`) |
| Explorer | Overrides (switch on/off, hit counter, ⚠ upstream changed, context menu) and page resources as a tree (origin → folders → files, served-from-override dot, iframe badge, a badge naming the kind of worker that loaded the file); scripts and stylesheets expand to the original files of their source map (root → folders → files, third-party code under a closed **Libraries**; §6.8). A filter box covers both, including iframe and worker URLs and loaded originals (a bundle with matching originals is listed, open). The status bar counts the iframes and workers that loaded files. The tree is virtualized and keyboard-navigable over all rows; resource events are applied once per animation frame (every 250 ms while the window is hidden), so pages with thousands of files stay smooth |
| Original sources | Open read-only from the Explorer or the palette: a tab of their own after the file tabs, a header with a **Read-only** badge, where the file comes from and **Go to bundle code**, and Monaco's read-only message when typed into. Save, pretty-print and diffs don't apply. An original the map has no text for says so, and offers its bundle code |
| Go to bundle code / Go to original source (Ctrl/Cmd+Shift+M) | From a line of an original to the code it became in the bundle's tab (opened as usual: pretty-printed, or the override that applies), or from the cursor in a script or stylesheet tab to the original line. Header buttons, the editor's context menu, **View** menu and palette. Exact through pretty-printing and outside your edits; inside them, or where a new build changed the file, a toast says why a jump landed short or couldn't be made |
| Command palette (Ctrl/Cmd+K or P) | Fuzzy search over every page file, the original files of loaded maps, overrides and actions; the list refreshes while open as files arrive |
| Layout | Sidebar and preview are fitted to the window (the editor keeps at least 240 px; panel minimums give way below that, e.g. when zoomed in). Hiding the preview takes the native page view out of the window with it. Visibility and sizes are saved on every change |
| Large files | Scripts, stylesheets and HTML over 1 M characters open in a lite mode: syntax colouring only (Monarch grammars, no language service or validation, folding, minimap or bracket colourization), shown as "Large file" |
| Focus | Opening or switching tabs (original sources too) focuses the editor; closing a tab from the keyboard, typing in a field or arrowing through the Explorer never has focus pulled into the code |
| Rules | The Explorer's **Rules** section lists the workspace's rules, oldest first: what each does, its pattern, a switch, and how often it applied this session. **+** starts a rule of each kind (Block requests, Change response headers, Allow cross-origin requests); right-click to edit, turn on or off, copy the pattern or delete (asked first). A file's context menu blocks it (by its exact URL, any query) or its iframe, removes a document's Content-Security-Policy, or starts a header rule for it, all but the last in one click with an Undo in the toast; a blocked file stays in the tree, struck through, and offers to unblock it (turning its rule off) or open its rule. The page's own document can't be blocked. The palette lists rules (open, turn on or off) and the new-rule actions |
| Rule pages | A rule opens as a page tab, one per rule: the URL matcher (as an override's), request types, and the action's fields (header changes in order, with name suggestions and presets: remove CSP, allow framing, `Cache-Control: no-store`), notes on what the rule as written can't do (a regex pauses every request; the page itself is never blocked; the HTTP cache keeps the server's headers; CSP in a `<meta>` tag isn't a header; CORS needs a CORS rule), and the last 20 URLs it applied to. Edits are a draft on the tab until **Apply** (Enter, Ctrl/Cmd+S): invalid input isn't sent, only the changed fields are, and what is typed while it runs stays as a draft. A draft survives switching tabs but not a restart, so closing its tab, switching workspaces or quitting asks first. A new rule's page has **Create** instead and becomes the rule's page. Rules apply from the next request, so the page reloads after a change if that setting is on |
| Workspaces | The rail lists them below Explorer, Actions and Search: a tile each (site favicon or the name's first letter, on the workspace's colour), the active one marked, + to add one. Clicking another tile switches to it (§5.1); clicking the active one opens a popover to rename it and pick its icon and colour, applied as you change them; right-click for the same, or to delete it. The tooltip shows the name and the page title. The palette lists them too |
| Close with unsaved edits | Closing a tab asks first. Closing the app keeps every unsaved edit as a draft and reopens it next time, with the tabs and the last page (see §5, Session restore); unapplied rule edits aren't kept, so it asks first when there are some |
| Menu | App menu replaces Electron's default, so Ctrl/Cmd+R reloads **the site**, not the editor. Undo/redo/select-all are routed to Monaco (or to the website, or the website window's address bar, when one of those has focus). Page DevTools: Ctrl/Cmd+Shift+J; editor DevTools: Ctrl/Cmd+Alt+I. Ctrl/Cmd+B toggles the sidebar. **View › Website in Its Own Window** moves the website either way (§7.1). **View › Go to Original Source or Bundle Code** (Ctrl/Cmd+Shift+M) jumps whichever way applies, and says so on other tabs |
| Website window | The preview's toolbar has a button to move the website into a window of its own, and that window's toolbar one to put it back; so do the View menu and the palette. While it is out, the editor takes the preview's room, and the title bar's preview button brings the website back. Closing its window puts it back too |

### 7.1 The website in its own window

The site's `WebContentsView` can move to a window of its own (`PageWindow`), e.g. to put it on another screen, and back. The view is moved, not recreated (`contentView.addChildView` in the other window takes it out of the first): the page keeps running with its state, history and DevTools, and interception and the console keep going, since the debugger and `Fetch` are bound to its `webContents`, not to a window.

- **The window** loads the editor UI with `#page-window`, which renders only the preview widget (toolbar, address bar and the host box the view is placed over), with the page's state from the same `page-state` events and `getPageState`. Its title follows the page's. It has no parent, so it can go to another screen, be minimized or go behind the editor on its own.
- **Placing the view:** both windows' UIs report the box they measured (`setPageBounds`), but only the window showing the view places it (`PageWindow.place`), in its own zoom factor; a report from the other window (the preview panel closing as the website leaves) is stale. After each move the view has no bounds until the new window's UI has measured.
- **Where it opens:** where it was last (bounds and maximized, saved half a second after it stops moving, in `page-window.json`), as long as 80 px of it each way are on a screen still connected. Otherwise on a screen other than the editor's when there is one (that is what the window is for), else on the editor's, centred, 1280×900 at most and at most 90% of the work area.
- **Coming back:** the toolbar button, the menu, the palette, the editor title bar's preview button, or closing the window put the view back into the editor and destroy the window. Quitting keeps it where it is: the window closes with the app (the editor's `closed`), `detached` stays saved, and the next start opens the website in its own window again once the page view is attached.
- **Commands:** the app menu belongs to both windows. Editor commands (the palette, the sidebar, save, …) bring the editor window forward first when the website window has focus; **Focus Address Bar** goes to the window showing the website (asked while the website window's UI still loads, it waits until that UI listens, which it shows by asking for the page's state); reload and DevTools act on the page wherever it is. Permission prompts and pop-ups are parented to the window showing the website, and the pop-ups already open move with it (a sign-in flow isn't closed with the window the website leaves).

## 8. Security

- Editor window: `contextIsolation`, `sandbox`, a strict CSP (`script-src 'self'`), no navigation, no pop-ups. It sees only `window.consoleEditor`.
- Site view: no preload, sandboxed, separate persistent session partition (`persist:site`). It cannot reach IPC, and every IPC handler also checks that the sender is the editor window; the page's own channels (navigate, reload, back/forward, its state, where its view goes, putting it back) also take the website window's UI (§7.1), which gets nothing else; the Actions window's UI takes the channels its panel needs (§6.9), and nothing else.
- Site permissions (`sitePermissions/`): Electron grants everything when a session has no handler, so the site session denies by default. Fullscreen, sanitized clipboard writes and pointer lock are granted; camera/microphone, location, notifications, clipboard reads, MIDI and launching other applications ask with a native dialog naming the requesting origin (remembered until quit; launching an app is asked every time); everything else is denied.
- Pop-ups: `window.open` pop-ups (sign-in flows need `window.opener`) open as child windows without interception; links meant for a new tab load in the page view, where overrides apply.
- A page's `beforeunload` guard cannot block reloads or navigation: editor-initiated reloads after a save must win, and Electron would cancel them without showing a dialog.
- **Trade-off:** Chromium's Local Network Access checks are disabled for the whole app (feature switches are process-wide), because documents served through `Fetch.fulfillRequest` have no address space and would otherwise be blocked from reaching localhost/intranet hosts (§6.5). Any page opened in the app can therefore reach local-network addresses, as in Chrome before these checks shipped. Browse only sites you are working on.
- Packaged builds flip Electron's fuses: `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` and the `--inspect` switches are ignored, the app loads only from its `app.asar`, whose integrity is checked on macOS and Windows, and the site view's cookies are encrypted with the OS keystore (not yet on macOS: an ad-hoc signed app would be asked for the Keychain password after every update). `file://` keeps its extra privileges because the editor UI and its module workers load from it.
- Packaged builds drop `--remote-debugging-port`/`--remote-debugging-pipe` when the data folder is the default one (compared after resolving links, so pointing `CONSOLE_EDITOR_USER_DATA` at it doesn't count as another), as Chrome does for its default profile: otherwise any local program could start the app with a port and read the site view's logins.
- One instance per data folder (`app.requestSingleInstanceLock`), so two processes never write the same overrides and session files. A second launch hands its URL to the running window and exits; if the first is still starting, that URL replaces the one it was about to open. On macOS, where Finder and `open` reopen the running app instead of starting a second process, the app also takes URLs from `open-url` the same way (following Electron's documentation; not yet checked on a Mac). Runs from source use a separate `… (dev)` data folder, so they never share one with an installed copy.
- IPC inputs are type-checked; matchers and rules are validated before storage (the same checks the form runs: header names are tokens, values hold no line breaks, protected headers are refused, at most 32 header changes and 200 rules per workspace); settings are filtered to known boolean keys. Source-map calls take only an http(s) bundle URL: main derives the map URL itself.
- Original sources are only ever shown as editor text, and their names (which the page chooses) as plain labels with control characters removed.
- The page stack's detector runs in each frame's main world, where the page can change what it answers: only known ids and signals are kept, versions only when they look like one, and everything shown besides a version is the app's own text (§6.10). The React hook stand-in is a global the page can see; **Framework hooks** turns it off.
- Rules change only what the app's own browser sees. A CORS rule makes an API readable by the page shown, credentials included, which is what it is for; it can't change what the server allows, and cookies still follow the browser's rules.
- The site sees a standard Chrome user agent (Electron tokens removed).
- All data stays local: nothing is uploaded, and there is no telemetry. Besides the page and out-of-page fetches for the files you open and for the page's favicon (from the site shown, through its session; kept only if its bytes are an image, and shown as an `<img>` data URL, where SVG can't run scripts), the source maps of the page's scripts and stylesheets when you ask for them (§6.8: http(s) through the site's session, with cookies only for the bundle's or the page's origin; `data:` maps decoded locally; any other scheme refused; 64 MB, 30 s), the only other network calls are the update check (GitHub's releases API and the release's CHANGELOG.md at its tag) and, when you ask for it, the update's download. **Settings › Check for updates** turns the automatic check off.
- Updates are verified before they are installed: electron-updater checks the SHA-512 in the release's `latest*.yml`, and manual downloads are checked against the release's `SHA256SUMS.txt` before they are kept. Both come from the same GitHub release, so this guards against damaged downloads, not a compromised release; signed builds would add that (§11). Release notes are Markdown rendered with `marked` and sanitized with DOMPurify (no images, styles, forms or frames), and their links open in the default browser (http and https only). `CONSOLE_EDITOR_UPDATE_FEED` (a local update server, for tests) is honoured only with a data folder of its own, like the debugging port.

## 9. Testing

| Layer | What | Command |
|---|---|---|
| Unit | Matchers, header/SRI/source-map transforms, stores (persistence, atomic concurrent writes), engine logic and navigation rules with a fake CDP transport, iframe session coordination (timeouts, sessions that go away, cascading detach), worker sessions (setup order and resuming, `Fetch` kept on, settings per worker type, which session lists and credits a worker's files, missed-override reasons, outdated service workers and `prepareReload` (unregistering by scope, letting go, retrying), a service worker's state kept for its next session, shared-worker discovery and holding), minified heuristic, version comparison, CHANGELOG parsing (and that CHANGELOG.md covers `package.json`'s version), the update service with fakes (checks, quiet failures, progress, checksums, install failures, schedule), the Linux desktop entry (quoting paths, which copies install one, a package's entry winning, removing only its own, following a renamed AppImage, writing only what changed) and the `.rpm`'s install script kept in step with electron-builder's, workspaces in the stores (migration, per-workspace tabs, drafts, overrides and actions, deletion, frame names), the action store (each workspace's actions across instances, what it refuses and why, a failed write changing nothing, changes run in order), favicon loading (recognising images, size caps), the console service with a fake CDP transport (frames across sessions, contexts, rows and their previews, format directives, running code, properties, the cap, clearing, the setting), the session observer (handed every session before it runs, never holding interception up) and where the website's and the Actions panel's windows open (its saved place while it is on a screen, another screen than the editor's, fitted to a small one, at the size each opens at) and how that is saved (Keep on top too), rules (validation, the store's persistence, entries it can't read, broken and unreadable files, the engine's stages, header edits, CORS and preflights, request types, patterns), source maps (finding the reference, loading limits, header capture), the page stack (the React hook stand-in in every session, with `Page` on first, taken out and put back with the setting; a frame looked at once it loads, silently in its main world, once for two loads in quick succession, not after it navigated, and not kept from the document it left; a cross-site iframe's own session, dropped with it; nothing while the console doesn't record, every frame once it does; the console unaffected when the stand-in can't go in; what the page answers checked: unknown ids and signals, builds, versions, at most 40) | `npm test` |
| Renderer | Resource tree building and filtering (worker entries: kept across navigations for service and shared workers, dropped with their worker, filtered by worker URL), command-palette fuzzy matching, missed-override notices by reason (a nested worker's once per override version), update notifications, What's New and page tabs, session sync and workspace switching (pending drafts written, tabs closed without losing them, the other workspace's reopened), console frames (keys, labels, colours), rows, filters, Keep rows, prompt history and frame names, rules (quick rules and Undo, toggling with rollback, rule pages and their drafts, applying only what changed, results that arrive after a switch, hits and recent requests), original sources (parsing, positions through pretty-printing, tabs, jumps both ways, the tree, the palette), actions (finding an action's frame by key or by name, labels of frames not on the page, runs and why one couldn't run, the form's openings, saving and deleting, copies, the palette's group, the bridge loading and following them), the Actions window's bridge (what it loads, the events it follows and those it ignores) and the editor's copy of where the panel is and of settings another window changed, the page stack (UI libraries named once, the top page's first; findings by kind; one Page stack tab; the bridge's snapshot and `stack-changed`) | `npm test` |
| Architecture | Feature-Sliced Design layer rules; the code-structure rules (files of at most 150 lines, one function, component, class or store per file named after it, data-only constants/types/index files, no `switch`) | `npm run lint:fsd`, `npm run lint:structure` |
| Integration | Engine in real Chromium against the fixture site: gzip, static and runtime SRI, globs, CSS/HTML overrides, 404, redeploy detection, source maps, disable. Iframes through the session-aware WebSocket transport (`test/helpers/chromium.ts`): same-site, cross-site and nested iframes, SRI inside iframes, iframe HTML overrides, same-site navigation, removal, reload; each asserts the iframe really is a separate target. The console on a page of service iframes (same-site, and two on sites of their own): every frame's first log line on its own frame, code run in one frame and another frame's logs reacting, top-level `await` and expanding the result, uncaught errors and rejections, a frame keeping its id across a navigation, a cross-site frame's function refused from the top page but run in the frame itself (why actions run in their frame). Workers against the fixture's `/workers/` page (`workers.chromium.test.ts`, a fresh browser context per test): every kind runs while intercepted; edits reach a dedicated and a module worker's first script and imports, what a nested worker imports (its first script is served in Chromium 141, reported as missed in 152+), a shared worker, a service worker's script and imports, and an audio worklet's module; each file is listed with its worker and read through its session; a shared worker's races are forced by holding back its session's commands; workers under a cross-site iframe are served on its session and removed with it; workers are reported gone; an edit to an installed service worker applies on the next reload, and one whose page was left is reinstalled when its site loads again under other overrides (a workspace switch); the page's `registration.update()` is reported and the next reload undoes it; a service worker is listed again, and not reinstalled, when the page comes back to its site; the cache setting reaches what workers load. Rules (`rules.chromium.test.ts`): blocking before the server sees the request (a script, one inside a cross-site iframe, an iframe's document, a redirect's later hop), a URL both blocked and overridden, the page itself never blocked; a gzipped document's CSP removed and another's added, X-Frame-Options removed so a page can be framed, a document no rule changes never read, Cache-Control and Content-Type on streamed responses, headers back once a rule is off; CORS with credentials, a preflight the API refuses, redirects. Source maps named by headers, `X-SourceMap`, comments and `data:` URIs, a stylesheet's, and an override-served bundle's. The page stack (`stack.chromium.test.ts`): a React app the test bundles from the repo's react and react-dom, found through the hook stand-in with its version, as a production and a development build, and by its keys with **Framework hooks** off (and no hook left in the page); what Vue, Pinia, Angular, Next.js and webpack leave in a page; a cross-site iframe's React, which found the stand-in in place before it loaded; no console rows | `npm test` (skips if no Chromium; `npx playwright install chromium`) |
| End-to-end | Built Electron app driven by Playwright: open site, edit, save, page runs it, disable/enable, edit files inside a cross-site and a nested iframe, the fixture's `/workers/` page with its workers' files listed under their worker's badge and edited (imports of each kind of worker; a module worker's static import; the first script of a dedicated worker, a shared worker, a service worker and a worklet; a service worker's script edited again, turned off and on, and deleted; a worker under a cross-site iframe), the update check's toast with Bypass service workers off and its reload, what stays listed when the page leaves (its site's service worker) and when it leaves the site (nothing), each workspace running its own edit of the service worker's script (`workers.e2e.test.ts`), persistence across restart, a second launch handing over its URL, workspaces (a new one starts empty and doesn't serve another's overrides, takes its site's favicon, switching back restores the page, tabs and overrides with no history from the other, renaming, all of it across a restart), the console (each frame's rows, running code in a picked frame and seeing another react, filtering by frame, naming a frame and keeping the name across a restart, clearing), actions (`actions.e2e.test.ts`: code run in the console saved as an action for its frame, run with one click and another frame reacting, one for a frame picked from the page showing what it threw, run from the palette, changed and deleted, each workspace's own across a restart), the Actions panel in a window of its own (`actionsWindow.e2e.test.ts`: moved there, running and making actions from it, the workspace and the settings following it, Keep on top, reopened where it was after a restart, back by closing it, from the sidebar's notice and from the View menu), the website in a window of its own (`pageWindow.e2e.test.ts`: moved there from the preview's toolbar without reloading, the editor's saved edits served to it, navigating from its toolbar, back from its button, by closing it, from the title bar and from the View menu; the site's pop-ups moving with it; put back, or asked for its address bar, while its window still loads; where it was and that it was open kept across a restart). Rules: block a script from the file tree, turn it off and on, undo a quick rule, remove a page's CSP, allow CORS for an API with a preflight, keep an unapplied edit on its tab and apply it from File › Save, rules per workspace, delete, and blocking from the first load after a restart. Updates against a local feed: the automatic announcement, What's New with the release's notes, a download refused for its checksum and then accepted. The original sources behind a bundle: listed, opened read-only, jumping to the pretty-printed bundle line and back, found from the palette. The page stack (`stack.e2e.test.ts`): the status bar names the fixture's UI libraries and opens the Page stack, which lists each finding by kind with its version, build and evidence, and scans again | `npm run test:e2e` (on headless Linux: `xvfb-run npm run test:e2e`) |
| Packaged | The installed app (asar, fuses, signature) fixes the demo store's checkout through the UI, driven over `--remote-debugging-port` since the fuses disable Node's inspector. The release workflow runs it on six runners, one per architecture: macOS (from the disk image), Windows (after a silent install; the x64 runner also checks that the ARM installer refuses it) and Linux (from the installed `.deb`, with Ubuntu's user-namespace restriction left on, also checking that the desktop entry and icons are the package's and the app added none of its own) | `npm run test:packaged -- <app>` |
| Update | An installed app updates itself to a build one patch higher, served by a local stand-in for GitHub: the notification, What's New, the download, **Restart to update**, the restarted app running the new version (and What's New after it); an AppImage's desktop entry starts the old file before and the renamed one after. The release workflow runs it for the Windows installers (then uninstalls, checking the updater's cache goes too) and the AppImages on their four runners. The `.deb` path (as root, through `sudo`, and with the password refused) and the AppImage installing on quit were checked by hand | `npm run test:update -- <app> <newer dist>` |

## 10. Packaging and releases

`electron-builder.ts` configures electron-builder; `npm run dist` builds the current system's installers into `dist/`. electron-vite bundles everything the app runs, dependencies included, into `out/`, so the package holds only `out/` and `package.json` (about 26 MB before Electron itself), plus the icons on Linux.

| System | Installers | Notes |
|---|---|---|
| macOS | `.dmg`, Apple silicon and Intel | Signed ad hoc unless a Developer ID certificate is configured (`CSC_LINK`/`CSC_NAME`): Apple silicon refuses unsigned code. Hardened runtime with JIT, camera, microphone and location entitlements (also for the helpers, where Chromium captures media) and the matching usage descriptions, without which macOS ends the app when a site asks. Not notarized, so Gatekeeper asks on first launch, and since an ad-hoc signature changes with every build, each new version is asked about again (as are sites' camera, microphone and location permissions) |
| Windows | NSIS installer per architecture (x64, ARM64), built in one run so `latest.yml` lists both | Per-user or per-machine; the app sets the same AppUserModelID as its shortcuts. `build/installer.nsh` makes the ARM64 installer refuse an x64 PC (electron-builder would otherwise leave shortcuts to nothing), and removes `%LOCALAPPDATA%\console-editor-updater` on uninstall but not when an update runs the old uninstaller: it holds the installer copy differential updates start from, and the new installer may be running from it. Unsigned, so SmartScreen may warn, and Smart App Control blocks it |
| Linux | AppImage, `.deb`, `.rpm`, `.tar.gz`, x64 and arm64 | `desktopName` names the `.desktop` file and Electron's window class, so docks match the window to the launcher. The `.deb`/`.rpm` install an AppArmor profile, which Ubuntu 24.04+ requires for Chromium's sandbox, and depend on ALSA and GBM too (Electron links them; electron-builder's defaults leave them out). The `.rpm` has no `/usr/lib/.build-id` links, which would clash with other packages built on the same Electron. The AppImage keeps the sandbox on (electron-builder's default desktop entry turns it off) and uses electron-builder's stable runtime, which needs FUSE 2 (`libfuse2`). The AppImage and `.tar.gz` install nothing, so on every start they give themselves what the packages install, for the user: the icons of `build/icons` (shipped as the `icons` resource) in `~/.local/share/icons/hicolor`, and `~/.local/share/applications/console-editor.desktop`, which starts the AppImage (or the `.tar.gz`'s executable) and hides itself once that file is gone (`TryExec`). Desktops find a window's icon through the entry named after its app id, and GNOME on Wayland has no other way, so without it they showed a generic icon. A file is rewritten only when it changed: the entry after an update renamed the AppImage, the icons (and the theme folder's time, which icon caches check) when a version brings new ones. Where a package installed the entry (the `.deb` or `.rpm`, even beside an AppImage), the desktop is left to it, and an entry the app installed earlier (marked `X-Console-Editor-Self-Installed`) goes with its icons: a user entry of the same name hides the package's from the app grid, even once its file is gone (`desktopEntry/`). The `.rpm`'s install script is electron-builder's plus a refresh of GTK's icon cache (`build/linux/after-install.tpl`), which Debian and Ubuntu do through a dpkg trigger |

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
- ✅ Workers: dedicated, shared and service workers, and worklets (§6.6).
- Watch `workspace/files` for external edits (edit in VS Code, the app reloads the page), with an "Open in external editor" action.
- ✅ Workspaces: a page, tabs and overrides per site or task (§5.1).
- Export/import a workspace's overrides as a zip or JSON, so a teammate can reproduce your fix.
- ✅ Response header overrides (CORS, CSP, cache) and request blocking (e.g. disable an analytics script): rules (§6.3).
- Search across all page resources (find which bundle defines a function).
- Docked/undocked page view, and responsive device presets.

**M3: Your own Chrome, and distribution**
- External Chrome mode: launch Chrome with a dedicated `--user-data-dir` plus `--remote-debugging-port`, or connect to a running one; `WebSocketTransport` implementing `CdpTransport`; one engine per tab.
- ✅ Installers with electron-builder, built and smoke-tested on all three systems by the release workflow (§10).
- ✅ Update notifications, What's New, and installing updates on Windows and with the AppImage, `.deb` and `.rpm` (§10.1).
- Signed and notarized builds, and with them installing updates in place on macOS.

**M4: Sources**
- ✅ Source-map explorer: list the original files from `sourcesContent`, open them read-only, and jump between an original line and the bundle line (§6.8).
- Research: editing an original module and recompiling only it (esbuild transform) inside a webpack/Vite bundle's module map.
- ✅ Console panel for the page and every frame in it (§6.7), and actions: code kept to run in a frame with one click (§6.9). The Actions panel also goes into a window of its own. Still to come ([research](ACTIONS_RESEARCH.md)): parameters in actions, sending a message to a frame without writing code, a message log of `postMessage` between frames, waiting for a log, scenarios, showing a frame in the page, reloading or retargeting one frame, network and storage per frame.
- Component inspector ([research](INSPECTOR_RESEARCH.md)): ✅ the page stack, which UI library, framework, state library and bundler each frame runs (§6.10). Still to come: the component and source file behind an element (production builds too, through source maps), and how data reaches it and why it re-renders.

## 12. Risks and open questions

| Risk | Mitigation |
|---|---|
| SSO providers blocking embedded browsers | Standard Chrome user agent now; external-Chrome mode (M3) as the fallback |
| Some anti-bot and sign-in scripts notice a debugger with `Runtime` enabled (the console turns it on in every frame) | **Record the console** in Settings turns it off; try that first when a site acts differently in the app |
| Huge bundles (10+ MB) are slow to pretty-print and highlight | The formatter runs in a worker that shuts down when idle; files over 1 M characters open in lite mode (no TypeScript service); file contents cross IPC once. Measured on a 2.7 MB bundle: opens in ~1.5 s; the editor window grows from ~190 MB to ~560–600 MB, of which only ~130 MB is JS heap (the rest is Monaco's native line/token buffers and rendering). A small file costs ~125 MB, mostly the TypeScript service, loaded on first use |
| Self-verifying scripts detect edits | Out of scope; document it |
| CDP behaviour changes between Chromium versions | Integration tests run the engine against real Chromium; pin and bump Electron deliberately |
| Minified identifiers make edits hard to write | Pretty-print, and read the original sources through their source maps (§6.8) |
| Huge source maps (tens of MB) | Read only when asked for, parsed in a worker; 64 MB cap; at most 4 maps (48 MB) kept decoded, the least recently used dropped, and the worker stopped after 3 idle minutes |
| Header edits that CDP accepts but Chromium ignores (a document's CSP via `continueResponse`, `Set-Cookie`, `Location`) | Probed in integration tests: documents are re-served with `fulfillRequest`, and the headers that can't change are refused with the reason |
| A broad rule pattern (a regex, `*`) pauses every request and slows the page | The form says so; exact and glob patterns pause only what they match |
