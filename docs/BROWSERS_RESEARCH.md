# Research: other browsers, captures and designs

**Status.** Phases 1 to 8 are built (SPEC §6.16–§6.18), and phase 9 but for the console, Network panel and inspector of an outside tab. WebKit's build couldn't be downloaded here, so it is checked with Playwright's Chromium standing in for it (see [Phase 8](#phase-8-webkit)). The to-do list below says, item by item, what was built and where it went another way.

**Question.** Two things in one request:

1. **Other browsers.** Show the browsers installed on this computer next to the address bar. Open the page in any of them to see whether something is broken there, and search the tabs they have open.
2. **Captures and designs.** Put a thumbnail at the right end of the toolbar that opens a list of images. The images are captures of the page, and designs to check it against pixel by pixel.

**Short answer.** Yes, in steps. Four findings shape the design:

1. **Opening a page in another browser works everywhere. Opening it with your overrides and rules depends on the browser's engine:**
   - **Chromium browsers** (Chrome, Edge, Brave, Vivaldi, Opera, Arc, Chromium): the app's engine already runs over a WebSocket connection (`engine/websocketTransport`, which the integration tests use). A Chromium browser the app launches can serve the workspace's changes the way the app's own page does. This is roadmap M3's external Chrome.
   - **Firefox** no longer speaks CDP. WebDriver BiDi can pause and answer requests, but it needs a second, smaller engine that reuses the app's matching, rules and transforms.
   - **Safari** has no automation that can change what it loads. The app can only open the page in it. To check the WebKit engine with your changes, the app can use Playwright's WebKit build, on every system.
2. **Captures come from CDP.** The viewport, the full page or one element can be captured at any pixel density, without resizing the window.
3. **A design can go over the live page, even on sites whose CSP forbids images from other sources.** The app draws the design on a canvas in an isolated world (verified below). It can't be HTML in the app's own window, because the native page view is drawn above the app's DOM.
4. **Most of the plumbing exists.** The app already has: a CDP connection to an outside browser, a transport-agnostic engine, the element picker, per-workspace stores and a still of the page for popovers.

---

## 1. What the reference app does

The screenshots show two popovers.

- **Browser switcher.** At the address bar's left is a 2×2 cluster of browser icons (Arc, Safari, Chrome, and a dashed slot to add one). It opens a list headed **Search browser tabs…**, with a gear and a chevron. Tabs are grouped by browser (Arc: a Figma file, a `localhost:5199` page, …), each with its favicon, title and host.
- **Files.** At the toolbar's right is a stack of thumbnails. It opens a list headed **Search files…**, with segments **All · Captures · Exports**. Each row has a thumbnail, a file name (`page-834.png`, `page-834-full.png`), a line such as "Export · Image · 15h ago", and a chevron.

## 2. What the app has today

| Piece | Where | What this work gets from it |
|---|---|---|
| A still of the page | `PageController/snapshotPage` (`capturePage()`: the viewport, as JPEG), `usePageSnapshot` | Popovers over the page freeze it into this still, since the native view is drawn above the DOM. The two new popovers do the same |
| CDP over WebSocket | `engine/websocketTransport` (`CdpConnection`, `attachToPage`). `test/helpers/chromium.ts` launches Chromium with `--remote-debugging-port=0` and a profile of its own | Driving an outside Chromium browser, and running the engine on its tabs |
| A transport-agnostic engine | `InterceptionEngine` / `PageInterception` over `CdpTransport`. Plain functions live in `engine/rules` (header, CORS and block rules) and `engine/transform` (headers, charsets, SRI, source maps). Matching is in `OverrideMatcher` and `requestMatches`; patch mode is `patchLive` | Overrides and rules in a Chromium browser as they are. A Firefox engine reuses the plain functions |
| Element picking | The inspector's picker (SPEC §6.13), in any frame | Capturing one element |
| Per-workspace stores | `ActionStore`, `OverrideStore`: written atomically, one write at a time, removed with their workspace | A `ShotStore` built the same way |
| Chromium flags the app needs | `chromiumFlags` (`LOCAL_NETWORK_ACCESS_FEATURES`) | The same flags for a Chromium browser the app launches |
| Toolbar in both places | `PreviewToolbar` (placement `editor` or `window`) | The two new buttons show in the editor and in the website's own window |
| Roadmap | M2 "responsive device presets"; M3 external Chrome with a `WebSocketTransport`; story U14 | Setting a design's width uses the same emulation as device presets. Phase 5 below is M3 |

## 3. Verified

These were probed in Chromium 141 (Playwright's build, headless) on a page served with `Content-Security-Policy: default-src 'self'; img-src 'self'`.

| Fact (verified) | Consequence |
|---|---|
| An `<img>` with a `data:` URL is blocked by that CSP, even when an isolated world (`Page.createIsolatedWorld`) creates it | The overlay can't be an `<img>` or a CSS background |
| In the same isolated world, `createImageBitmap(new Blob([bytes]))` drawn on a `<canvas>` works under that CSP. With `pointer-events: none`, the page still gets the pointer (`elementFromPoint` returns the page's element under it) | The overlay is a canvas, and the page stays usable under it |
| The page's own scripts see that canvas (isolated worlds share the DOM) | Add it to `<html>`, not `<body>`, and put it back if the page removes it. The docs say the page can see it |
| `Page.captureScreenshot` with `captureBeyondViewport: true`, clipped to `Page.getLayoutMetrics().cssContentSize`, returns the whole page: 800×3000 from an 800×600 viewport. The viewport and scroll position are unchanged afterwards | Full-page captures need no resizing |
| `Emulation.setDeviceMetricsOverride({ width: 1440, height: 900, deviceScaleFactor: 2 })` gives `innerWidth` 1440 and `devicePixelRatio` 2, and a capture of 2880×1800 | Before comparing, the page can take a design's width and density |
| Chromium started with `--remote-debugging-port=0 --user-data-dir=<dir>` writes `<dir>/DevToolsActivePort` (the port, then `/devtools/browser/<id>`). `/json/list` lists its tabs (id, title, URL) | The app finds a browser it launched through that file, without reading the browser's output, and lists its tabs |

**Not probed here**, since this environment has no Firefox or WebKit:

- Firefox's BiDi interception and reading response bodies;
- WebKit through Playwright;
- `Page.captureScreenshot` through Electron's `debugger` on a `WebContentsView`, which should behave as in Chromium since it's the same CDP;
- device emulation inside the docked view.

Each phase that relies on one of these starts by probing it.

## 4. Proposal

### 4.1 The browsers on this computer

| System | Where installed browsers are found | Icon |
|---|---|---|
| Linux | `.desktop` files whose `Categories` include `WebBrowser` or whose `MimeType` has `x-scheme-handler/https`. They are in `/usr/share/applications`, `~/.local/share/applications`, and the Flatpak and Snap exports. The launch command is the `Exec=` line without its field codes | `Icon=`, looked up in the icon theme's folders (`hicolor`, largest PNG) |
| macOS | The apps under `/Applications` and `~/Applications` whose bundle id is a known browser's (`com.google.Chrome`, `com.apple.Safari`, `company.thebrowser.Browser`, `org.mozilla.firefox`, `com.microsoft.edgemac`, `com.brave.Browser`, …) | `app.getFileIcon(appPath)` |
| Windows | `reg query` of `HKLM` and `HKCU\SOFTWARE\Clients\StartMenuInternet\*` (`shell\open\command`) | `app.getFileIcon(exePath)` |

- **What each browser records:** an id, name, version (where it's cheap to read), launch command and icon.
  - It also records an **engine**, from known ids: `chromium`, `gecko`, `webkit` or `unknown`. The engine decides what the app can do with the browser.
- **Scanning:** at most once a minute, when a menu opens.
- **Add a browser…** (the dashed slot) takes an executable. That covers portable and preview builds such as Chrome Canary or Firefox Nightly.
- **No brand logos in the repository.** Icons come from the system, which avoids trademark questions and matches what the user knows.

### 4.2 Opening the page in one

| Level | What happens | Browsers |
|---|---|---|
| **Open** | The current URL opens in the browser, with your everyday profile. Nothing is changed | All |
| **Open with my changes** | The app launches the browser with a profile of its own, and serves the active workspace's overrides and rules there. As with its own page, it reloads that browser's tabs on the site after a save | Chromium browsers (phase 5), Firefox (phase 7) |
| **Engine builds** | Playwright's WebKit (and, if useful, its Firefox) is downloaded when first used, and driven with your changes | WebKit on every system (phase 8) |

**Chromium browsers (phase 5):**

1. **Launch** `<exe> --user-data-dir=<userData>/browsers/<id> --remote-debugging-port=0 --no-first-run --no-default-browser-check --disable-features=<LOCAL_NETWORK_ACCESS_FEATURES> <url>`.
2. **Connect:** wait for `DevToolsActivePort`, then `CdpConnection.connect`. `Target.setDiscoverTargets` reports tabs as they open and close.
3. **Serve:** each page tab gets `attachToPage` and a `PageInterception` running the active workspace's overrides and rules, with the app's settings.
4. **Next launch:** a browser still running (its `DevToolsActivePort` answers `/json/version`) is reused.

Notes:

- **Why a profile of its own:** Chrome 136 and later ignore the debugging port on the everyday profile. The profile keeps its logins between launches.
- **Snap and Flatpak** browsers can only write inside their sandbox (Snap: under `~/snap/<name>/`), so the profile folder goes there.
- **Your own Chrome (U14):** Chrome 144 and later let the user allow remote debugging of the running browser from `chrome://inspect`, and the browser asks before a client connects. That needs checking. If it holds, the same connection works on the everyday profile.
- **What drives a launched browser's tabs:** at first, only overrides, rules and settings. The console, Network and inspector stay on the app's page. A page picker for the panels can come later.

**Firefox (phase 7):**

- **Launch** `firefox --profile <dir> --no-remote --new-instance --remote-debugging-port=0 <url>`. Firefox prints `WebDriver BiDi listening on ws://…`.
- **Commands used:**
  - `session.new`;
  - `network.addIntercept` (phases `beforeRequestSent` and `responseStarted`, with URL patterns);
  - `network.provideResponse`, `continueResponse` and `failRequest`;
  - `script.addPreloadScript` (the SRI guard, the overlay);
  - `browsingContext.captureScreenshot` (`origin: 'document'` for the full page);
  - `browsingContext.setViewport`.
- **Reading the upstream body** needs `network.addDataCollector` and `network.getData`, which are newer: probe which Firefox has them. Two features need that body: redeploy detection and patch mode. Without it they stay off in Firefox, and the menu says so.
- **A new `BidiServer`** reuses `OverrideMatcher`, `requestMatches`, `engine/rules`, `engine/transform` and `patchLive`. It doesn't share the CDP event flow.

**Safari:**

- **Open only.** `safaridriver` (WebDriver, macOS, after Develop › Allow Remote Automation) can capture Safari but can't change a response.
- **The menu says so:** "Safari: open only. Check WebKit with your changes →".

**WebKit (phase 8):**

- **The build:** Playwright's WebKit, downloaded into `<userData>/browsers/playwright` on first use, after the user agrees to the download size. It's driven with `playwright-core`, whose `route` answers requests in WebKit too.
- **The dependency:** `playwright-core` moves from the dev dependencies to the app's, pinned, since each build matches one version of it.

### 4.3 The browser menu

- **Where:** in the preview toolbar, left of the address bar, in both placements. The button shows up to four installed browsers' icons, as in the reference.
- **The popover:** the page freezes into its still, as for any popover over it. It holds:
  - **Search browser tabs…**, and a gear that opens Settings › Browsers (which ones to show, their profile folders, Add a browser…).
  - One group per browser: its icon, name and version, **Open**, and **Open with my changes** where its engine allows it.
  - For a browser the app launched, its tabs (favicon, title, host). A click brings the tab forward (`Target.activateTarget`, `browsingContext.activate`). **Open here** loads the tab's address in the app.
  - A dot on a browser the app is driving.
- **The palette:** "Open in Firefox", "Open in Chrome with my changes", and so on.
- **The status bar:** how many outside tabs are getting the workspace's changes.
- **Tabs of browsers the app didn't launch** (the reference lists Arc's) come later (phase 9), and depend on the system:
  - macOS: by AppleScript, for Safari, Chrome, Arc, Edge and Brave. macOS asks for Automation permission first.
  - Firefox: from its session file, `sessionstore-backups/recovery.jsonlz4`, on any system.
  - Chrome elsewhere: only with remote debugging turned on.
  - They're used to bring an address from your everyday browser into a workspace.

### 4.4 Captures and designs (shots)

```ts
interface Shot {
  id: string;                 // 8 hex chars
  kind: 'capture' | 'design';
  name: string;               // "shop.test-cart-1440-full.png"; editable
  width: number; height: number;   // pixels in the file
  scale: number;              // device pixels per CSS pixel: 2 for a 2× capture or a 2× design export
  pageUrl?: string;           // a capture's page
  browser?: { id: string; name: string; version: string };   // a capture's browser ('app' for the app's own page)
  viewport?: { width: number; height: number };              // CSS pixels, when captured
  area?: 'viewport' | 'page' | 'element';
  group?: string;             // captures taken together in every browser (§4.6)
  createdAt: number; updatedAt: number;
}
```

- **Storage:** `shots.json` (`{ version: 1, shots: (Shot & { workspaceId })[] }`), `shots/<id>.<png|jpg|webp>`, and a 256 px JPEG thumbnail `shots/<id>.thumb.jpg` made with `nativeImage.resize`. Everything is written atomically.
- **Per workspace.** A workspace's shots are deleted before the workspace itself, for the same reason its actions and overrides go first.
- **Capturing:** the viewport, the full page, or one element (the inspector's picker, then `DOM.getBoxModel` for the clip), in the app's page or in a browser it drives. Before capturing, the app can:
  - wait for `document.fonts.ready` and for 500 ms without requests;
  - hide the design overlay;
  - optionally, pause animations (`Animation.setPlaybackRate` 0).
- **Limits:** a full page is capped at 32 767 device pixels tall, the tallest a canvas draws; past Chromium's largest texture (16 384) it is captured in parts and joined (SPEC §6.17). A file is at most 50 MB, and a workspace holds at most 500 shots.
- **Importing a design:** **Import design…** (several files), dropping files on the list, or pasting (Figma's Copy as PNG). PNG, JPEG and WebP are accepted. The renderer decodes each one to check and measure it, and the file is kept as it came.
  - A design's **scale** comes from `@2x` or `@3x` in its name, else 2 when it is wider than 2000 px, else 1. It can be changed on the shot's page.
  - A Figma frame by its link, through Figma's API with a personal token (SPEC §6.17).

### 4.5 The shots list

- **Where:** at the right end of the preview toolbar, a button shows the latest shots' thumbnails, stacked as in the reference. Its popover freezes the page, like the browser menu.
- **The popover:**
  - A **Search shots…** field (name, host, browser).
  - Segments **All · Captures · Designs**. The reference's "Exports" become designs.
  - Rows with a thumbnail, a name, and a line: "Capture · Firefox 131 · 1440 × 900 · 15 h ago" or "Design · 1440 wide · 2 days ago". A chevron opens the shot's page.
  - In the header: **Capture** (a split button: the viewport, the full page, an element, in every browser) and **Import design…**.
  - A row's menu: Compare with the page, Compare with…, Put over the page, Rename, Copy image, Save as…, Show in folder, Delete.
- **The palette:** Capture the page, Capture the full page, Import a design, Open a shot…
- **A shot's page** is an editor tab of its own kind, like What's New. It shows:
  - the image, at Fit, 100 %, or zoomed in to a pixel grid;
  - the colour of the pixel under the pointer;
  - the image's size and scale, and where it came from (address, browser, viewport).

### 4.6 Pixel-perfect checks

**Over the live page (the overlay):** **Put over the page**.

- **Width:** the page takes the design's width in CSS pixels (width ÷ scale) through device emulation. In the docked view, the page is scaled down to fit, as in DevTools' device mode; that needs probing in Electron.
- **Drawing it:** the design is drawn on a canvas in an isolated world (`Page.addScriptToEvaluateOnNewDocument` with a `worldName`, and the image sent once the frame has loaded). It either scrolls with the page, absolute on the document, or stays fixed to the viewport.
- **Controls:** a bar under the preview toolbar, never inside the page. It has opacity, **Difference** blending, **Invert**, x/y nudges (arrow keys while the bar has focus, Shift for 10 px), Scroll with the page / Fixed, Hide (H) and Remove.
- **In other browsers:** the same script works in a Chromium browser the app drives, and in Firefox through a BiDi preload script.

**On stills (the compare page):** two shots, or a shot and a fresh capture at the design's width.

- **Modes:** **Side by side** (scrolled together), **Swipe**, **Onion skin**, and **Difference**. Difference shows differing pixels in red over a faded base, with the share of pixels that differ and boxes around the differing areas to step through.
- **Alignment:** top left, both scaled to CSS pixels, with x/y offsets.
- **The diff** runs in a worker. It's a pixelmatch-style compare: YIQ colour distance with a threshold, ignoring anti-aliased pixels.

**Across browsers:** **Capture in every browser**.

- **What it does:** it covers the app's page and every browser the app drives. Each gets the same address, viewport and density, and waits for the load, fonts and 500 ms without requests. Then each captures the full page.
- **The result** is saved as one group. A compare page shows the group as a grid against a baseline (the app's capture, or a design), with each capture's share of differing pixels. That's the "is something broken in Firefox?" check, in one click.

## 5. Code layout sketch

```
src/main/browsers/            findBrowsers/ (linux, mac, windows), openInBrowser, DrivenBrowsers (launched ones: connection, tabs, engines),
                              chromium/ (launch, readDevToolsActivePort, ChromiumDriver: targets → PageInterception),
                              firefox/ (launch, BidiConnection, BidiServer), webkit/ (Playwright, phase 8), registerBrowserIpc
src/main/shots/               ShotStore (shots.json, files, thumbnails), captureOverCdp (viewport, page, element), importDesign, registerShotIpc
src/main/overlay/             the injected overlay source, DesignOverlay per page (CDP and BiDi adapters)
src/shared/                   shots/shotSchema, types (Shot, BrowserInfo), IPC channels, events browsers-changed and shots-changed
renderer entities/            browser (installed and driven, their tabs), shot (the list)
renderer features/browser/    open-in-browser, drive-browser
renderer features/shot/       capture, import-design, compare (with the diff worker), overlay (the bar's state)
renderer widgets/             browser-menu, shots-menu, shot-page (viewer and compare), overlay-bar; page-preview gains the two buttons
```

- **Why the new slices are grouped** (`features/browser/`, `features/shot/`): steiger allows at most 20 ungrouped feature slices, and the app is close to that limit.
- **Structure:** every new file follows the code-structure rules. Large parts (`BidiServer`, `ShotStore`) start as folders.

## 6. To-do list

Each phase ends in a pull request of its own. Each updates SPEC, the CHANGELOG and, where it shows, the README.

### Phase 1: Open in another browser
- [x] `findBrowsers` for Linux, macOS and Windows, each tested on fixtures (`.desktop` files, `reg query` output, app folders).
- [x] Icons: the Linux icon theme lookup, and `app.getFileIcon` on macOS and Windows. Each is cached as a data URL.
- [x] `openInBrowser(id, url)`: a detached spawn of the browser's own command: `open -a` on macOS, the `Exec=` line on Linux (Flatpak's through `flatpak run`), the registry's command on Windows.
- [x] IPC (`listBrowsers`, `openInBrowser`), zod-checked, and the `browsers-changed` event.
- [x] `entities/browser`, and the browser button with its popover in `PreviewToolbar`, in both placements (search, one row per browser, **Open**).
- [x] Palette items, and Settings › Browsers: which ones to show, and Add a browser….
- [x] Tests: unit tests for the parsers; e2e with a fake browser (a script that writes the address it got to a file).

### Phase 2: Captures
- [x] `captureOverCdp`: the viewport, the full page (with the height cap) and an element, on a `CdpTransport`. Probe it on the app's `WebContentsView` first.
- [x] `ShotStore`: files, thumbnails, `shots.json`, limits, removal with the workspace (in `WorkspaceController`'s delete order).
- [x] IPC: `capture`, `listShots`, `renameShot`, `deleteShot`, `showShotInFolder`, `saveShotAs`, `copyShot`.
- [x] `entities/shot`, and the shots button (stacked thumbnails) and its popover: search, segments, rows and row menu.
- [x] The shot page: an editor tab kind with the viewer (zoom, pixel grid, colour under the pointer, details).
- [x] An element capture from the inspector's picker, and palette items.
- [x] Tests: unit tests for the store; integration tests for full-page and element clips in Chromium; e2e: capture, list, rename, delete, restart.

### Phase 3: Designs and the compare page
- [x] **Import design…**, dropping files, pasting: decode and measure in the renderer, guess the scale, keep the file.
- [x] The compare page: side by side, swipe, onion skin, difference, and offsets.
- [x] The diff worker: YIQ distance over a threshold, the share of pixels that differ, differing areas (16 px cells, at most 200), and anti-aliased pixels told apart (shown yellow, not counted). On a 1440×10 000 page with a tenth of its pixels differing it takes about 4 s, 2 s without telling anti-aliasing apart (`test/perf/renderer/diff.perf.test.ts`).
- [x] "Compare with the page": capture at the design's width (`Emulation.setDeviceMetricsOverride`), then compare, then clear the emulation.
- [x] Tests: unit tests for the diff (identical, shifted and anti-aliased images); e2e: import a PNG, compare it with a capture of a fixture page, check the share of differing pixels.

### Phase 4: The overlay on the live page
- [x] The injected overlay (canvas, `pointer-events: none`, scroll or fixed, put back if removed), installed in an isolated world on every load.
- [x] `DesignOverlay` on CDP: install, update (opacity, blend, offset, invert, hidden) and remove it. Updates are small messages, and the image is sent once.
- [x] Device emulation for the design's width in the docked view and in the website's own window: Electron's `enableDeviceEmulation` (CDP's scale draws wrong in a `WebContentsView`). M2's device presets aren't built on it yet.
- [x] The overlay bar and its keys, and hiding the overlay while capturing.
- [x] Tests: e2e on a fixture page with a strict CSP: the canvas is there, the page still gets clicks, it survives a reload, and it's gone after Remove.

### Phase 5: Chromium browsers with your changes (M3)
- [x] `launchChromium` (the flags above, a profile under `userData`, the Snap and Flatpak paths) and `readDevToolsActivePort`; reuse a browser that's still running.
- [x] `DrivenChromium`: browser-level auto-attach (a new tab waits until it is set up), a `PageInterception` per tab, following workspace switches and override, rule and settings changes. It reloads after saves, forgets a browser that closes, and reaches it again through its profile.
- [x] Tabs in the browser menu (search, bring forward, Open here), the dot, the status bar count, and **Open with my changes**.
- [x] Captures in those tabs, through the same CDP code. Not yet: the overlay in them.
- [x] Your everyday Chrome (U14): with remote debugging turned on in `chrome://inspect/#remote-debugging`, it writes `DevToolsActivePort` in its everyday profile; the app reaches it there and drives only the tabs it opens (SPEC §6.16). The permission prompt itself couldn't be probed (the container's Chromium 141 predates it); a Chromium on a stand-in everyday profile plays the part in the tests.
- [x] Tests: integration with Playwright's Chromium launched as the installed browser (an override served, a reload after a change, captures, reached again, forgotten once quit); e2e with a launcher running it.

### Phase 6: Capture in every browser
- [x] One capture in each driven browser at the same address, viewport and density, with settle rules; saved as a group.
- [x] The group's compare grid against a baseline, with the share of differing pixels per browser.
- [x] Tests: e2e with the app's page and one launched Chromium.

### Phase 7: Firefox with your changes
- [x] Probe BiDi in the current Firefox (157): `addIntercept` and headers at `responseStarted` hold; `provideResponse` takes a body only before the request is sent; `getData` reads a body only once the response has completed (so no patching in flight); `setCacheBehavior` stands in for reload's `ignoreCache`; the address is in the profile's `WebDriverBiDiServer.json`. Preload scripts weren't tried in cross-site iframes.
- [x] `launchFirefox` (a profile with `user.js` prefs for no first run and no updates), and `BidiConnection`.
- [x] `BidiInterception`: every request paused while an override or a rule is on (BiDi's URL patterns can't express globs and regexes), overrides answered before sending (`engine/answering`, shared), rules at both stages, the plain engine functions. Redeploy detection and patch mode are off: no body can be replaced once upstream answered.
- [x] Tabs (`browsingContext.getTree`, titles read in each page), captures (`captureScreenshot`), the viewport (`setViewport`). Not yet: the overlay.
- [x] Tests: integration and e2e tests against Firefox, skipped where it isn't found (`FIREFOX_PATH`, or `firefox` on the PATH). GitHub's Ubuntu runners ship Firefox, so CI runs them without a change.

### Phase 8: WebKit

Built (SPEC §6.16), and not as first planned in two ways:

- **No installer run.** Playwright's `cli.js install webkit` forks `oopBrowserDownload.js` as Node, which the packaged app's fuses refuse (`runAsNode: false`). The app downloads the build itself instead: its URLs, folder and program from the pinned `playwright-core`'s registry (`PLAYWRIGHT_DOWNLOAD_HOST` too), unpacked with Playwright's own extractor, the program made runnable and the marker written last, as the installer does.
- **Packaging.** `playwright-core` is in the dependencies (pinned: the registry and extractor are its internals), left out of the main bundle and shipped in the asar as it is (not unpacked: nothing forks it), 134 files. An unpacked Linux build lists WebKit, downloads a stand-in build from a stand-in host and launches it.
- **Nothing to check WebKit itself with.** Playwright's CDN is refused by the development container's network. The driver speaks only Playwright's API, so Playwright's Chromium stands in for WebKit in its tests; the download is tested against a stand-in host. On a machine that can reach the CDN (CI with `npx playwright install --with-deps webkit`), a test with the real build is still to add.

- [x] The packaging change above (checked with an unpacked build; the release workflow's packaged tests don't cover WebKit yet).
- [x] The download with progress in the menu's row, once agreed, and removing it from Settings.
- [x] A driver on `playwright-core` behind the `Driver` interface: `route` carries out `decideRequest` (fulfil, abort, continue) and, through `route.fetch`, `ruledHead` for response rules; `page.screenshot` for captures (in parts past a texture); a context per capture viewport; the design by init scripts in the page's world.
- [x] Tests: the driver with Playwright's Chromium, the download against a stand-in host, the menu's flow end to end.

### Phase 9: Later
- [x] Tabs of everyday browsers on macOS: JavaScript for Automation rather than AppleScript's text (JSON back, each app's terms looked up when run), for Safari, Chrome, Edge, Brave, Arc and Vivaldi, only while they run (SPEC §6.16). The script is checked against a stand-in for JXA's objects; it couldn't be run on a Mac here.
- [x] Firefox's session file everywhere: `recovery.jsonlz4` of each profile in `profiles.ini`, read only when asked (SPEC §6.16).
- [x] Figma frames by link: the frame's name, its 2× render downloaded, a personal token kept with `safeStorage` once it works (SPEC §6.17). Tested against a stand-in for Figma's API (`CONSOLE_EDITOR_FIGMA_API`); `api.figma.com` can't be reached from here.
- [x] Stitching full pages taller than the texture limit: parts 4096 device pixels tall, their rows packed again as one PNG without decoding it whole (only each part's first row is unfiltered), down to 32 767 device pixels (SPEC §6.17).
- [ ] The console, Network and inspector for an outside tab.
- [x] The design over a driven browser's tab: Chromium through the same isolated-world script, Firefox through preload scripts in a sandbox, WebKit through init scripts; each at the design's width while that is on (SPEC §6.16).

## 7. Limits and risks

| Risk | Mitigation |
|---|---|
| Safari can't be served changes | It is only opened as it is; WebKit through Playwright's build is offered beside it, downloaded on first use |
| Firefox replaces a body only before the request is sent | Overrides answer then, with their file type's headers; redeploy detection and patch mode stay off there (README › Limitations) |
| Snap and Flatpak sandboxes | Profile folders inside the sandbox. If a launch fails, show the browser's own output |
| The page's scripts can see or remove the overlay | Add it to `<html>` and put it back; documented |
| Sticky headers and lazy images in full-page captures | A fixed element appears once, at the top. An option scrolls through the page first, so lazy images load |
| Fonts differ between systems, so cross-system diffs are noise | Compare captures taken on one machine; the compare page names each capture's browser and system |
| Big images use a lot of memory | Caps (height, file size, shots per workspace); the diff runs in a worker on bitmaps |

## 8. Decisions to make

Taken: the recommendations below, as built.

| Question | Recommendation | Alternative |
|---|---|---|
| Build order | Phases 1 → 2 → 3 → 4 first: useful on their own, and they need no outside browser. Then 5, 6, 7, 8 | Phase 5 first, since M3 and U14 are already on the roadmap |
| Where shots live | Per workspace, like overrides and actions | One library for all workspaces, filtered by host |
| The shots list | A toolbar popover (the reference), plus the palette | A rail view listing shots, with more room for groups |
| The diff | Our own small compare in a worker | `pixelmatch` (ISC licence, no dependencies) |
| WebKit | Playwright's build, downloaded on use | Only "Open in Safari" on macOS; no WebKit with changes |
| Profiles of driven browsers | One per browser under `userData`, logins kept | A new temporary profile each launch |
