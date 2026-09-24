# Changelog

All notable changes to Console Editor. The app shows these notes as **What's New**, and each release on GitHub starts with its section.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Workspaces.** Keep one for each site or task you're working on, and switch between them from the left rail. Each has its own page, open tabs, unsaved edits and overrides, so a fix in progress on one never shows up in another, even on the same site. A workspace's tile shows the site's icon, or the first letter of its name on a colour you pick: click the current tile, or right-click any, to name it or change its icon. **+** adds a workspace, and the command palette switches between them too. Everything you had before is in the first one.

### Changed

- **A new app icon**, fitted to each system: it follows Apple's icon grid on the Mac, fills the frame on Windows, and comes in every size Linux desktops ask for.
- **The website preview's toggle** in the title bar has its own icon, a browser window. It used to look like the sidebar's toggle.

### Fixed

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

[Unreleased]: https://github.com/olehwebdev/console-editor/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/olehwebdev/console-editor/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/olehwebdev/console-editor/releases/tag/v0.1.0
