# Changelog

All notable changes to Console Editor. The app shows these notes as **What's New**, and each release on GitHub starts with its section.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Rules: block requests and change response headers.** Right-click a file in the Explorer to block it (an analytics script, a slow third-party iframe) or to remove a page's Content-Security-Policy, in one click with an Undo. Or add a rule from the new **Rules** section: block every request matching a URL pattern, set or remove response headers (with presets for CSP, framing and caching), or let the page call an API on another origin, preflights and cookies included. A blocked request never reaches the server, and the file stays in the tree, struck through. Each rule shows how often it applied and its recent requests, turns on and off with a switch, and belongs to its workspace. Edits on a rule's page stay on its tab until you apply them (**Apply**, Enter or Ctrl/⌘+S).

### Changed

- **Reload page after changes** (formerly *Reload page on save*) also reloads after you add, change, turn on or off, or delete a rule. **File › Save** is now just *Save*, as it applies rules too.

### Fixed

- **An override whose pattern also matches an API's CORS preflight** no longer answers the preflight with the file.

## [0.3.0] - 2026-09-24

### Added

- **A console for the page and every iframe in it.** Open it under the editor with **Ctrl/⌘+J** or the new button in the title bar. The logs, errors and browser messages of every frame, even iframes from other sites, arrive in one list, each row tagged with its frame, from the first line a frame logs. Pick a frame and run code in it: send an event in one service and watch another react, with how long it took next to each row (`+4ms`). Filter by frame (each shows its errors and warnings), by level or by text; open logged objects; click where a row came from to open that file. Give frames names such as "billing", kept per workspace. **Record the console** in Settings turns it off, for a site that acts differently while it is on.
- **Workspaces.** Keep one for each site or task you're working on, and switch between them from the left rail. Each has its own page, open tabs, unsaved edits and overrides, so a fix in progress on one never shows up in another, even on the same site. A workspace's tile shows the site's icon, or the first letter of its name on a colour you pick: click the current tile, or right-click any, to name it or change its icon. **+** adds a workspace, and the command palette switches between them too. Everything you had before is in the first one.
- **Resize handles show a grip**: three dots in a small tab bulging out of the edges you can drag (the sidebar's and the website preview's), so it's clear which ones move. The tab lights up with the edge on hover, and you can grab it too.
- **Workers and service workers.** Your overrides now apply to what Web Workers, shared workers, service workers and worklets load, including a worker's own script and the scripts it imports. The Explorer lists these files with a badge naming the kind of worker that loaded them (hover it to see which one). The filter and the command palette also find them by the worker's URL, a file's menu can copy that URL, and the status bar counts the workers.
- **Service worker edits apply on reload.** A service worker keeps the scripts it installed, so when you save a change to one, the app's reload unregisters the old worker and the page installs your version. This needs the page to register its service worker on every load, and the worker's push subscriptions are lost. After you restart the app, it doesn't know which of your edits a site's service worker installed, so if the site has any script override, the app's first reload with that worker running reinstalls it too, and its push subscriptions are lost. Leaving a site and coming back doesn't reinstall it; switching to another workspace on the same site does when the two workspaces edit its scripts differently, so each runs its own version.
- **A notice when an edit can't apply.** Chromium doesn't let the app change the first script of a worker started by another worker (the files that worker loads still get your overrides); the app tells you once for each version of your override. Chromium's own update check can reinstall a service worker from the server: when the page asks for one, whatever your settings, and with **Settings › Bypass service workers** off, soon after a page loads. The app tells you, and **Reload page** puts your version back.

### Changed

- **A new app icon**, fitted to each system: it follows Apple's icon grid on the Mac, fills the frame on Windows, and comes in every size Linux desktops ask for.
- **The website preview's toggle** in the title bar has its own icon, a browser window. It used to look like the sidebar's toggle.

### Fixed

- **Pages that use Web Workers or worklets no longer hang.** In the app's browser their workers never started, so whatever a page did in them never finished, with or without overrides. This affected every version so far.
- **Hiding the website preview** now hides the site too. It used to stay on screen, drawn over the editor.

## [0.2.0] - 2026-09-24

Console Editor now keeps itself up to date. Version 0.1.0 had no updater, so this one is installed by hand; the ones after it come to you.

### Added

- **Updates.** Console Editor checks GitHub for a new release when it starts and every few hours, and tells you when there is one. One click downloads it in the background. On Windows and with the AppImage it then installs when you click **Restart to update** or quit the app; the `.deb` and `.rpm` install it when you click **Restart to update**, after asking for your password. Your unsaved edits come back as drafts. On macOS it downloads the new disk image, checks it and opens it for you to drag into Applications (installing in place needs builds signed with an Apple Developer ID); a `.tar.gz` copy gets the new archive in Downloads. Turn the checks off in **Settings**, or check any time from **Help › Check for Updates…**.
- **What's New.** After an update the app opens a page with what changed, like the one you're reading. Open it again from **Help › What's New** or the command palette.

## [0.1.0] - 2026-09-24

The first release.

### Added

- **Edit what a live site loaded.** Open any site, pick a script, stylesheet or HTML document it loaded, edit it in Monaco (VS Code's editor) and save: the page reloads running your version, served in place of the original through the Chrome DevTools Protocol. Minified bundles are pretty-printed on open.
- **Cross-site and nested iframes**, each set up before it may load anything.
- **Overrides that survive deploys:** match hashed bundle names such as `main.*.js`, and get a warning when the live file changes under your override.
- **The hard cases handled:** compressed responses, Subresource Integrity (static and set at runtime), the HTTP cache, service workers and stale source maps.
- **Diff** your version against where you started, or against today's live file.
- **Command palette** (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd>) for every file the page loaded, your overrides and all actions.
- **Session restore:** closing keeps unsaved edits as drafts and reopens your tabs and the last page.
- **Installers** for macOS (Apple silicon and Intel), Windows (x64 and ARM) and Linux (AppImage, `.deb`, `.rpm`, `.tar.gz`; x64 and arm64).

[Unreleased]: https://github.com/olehwebdev/console-editor/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/olehwebdev/console-editor/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/olehwebdev/console-editor/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/olehwebdev/console-editor/releases/tag/v0.1.0
