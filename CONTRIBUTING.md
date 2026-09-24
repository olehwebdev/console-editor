# Contributing to Console Editor

Thanks for helping! Bug reports, ideas and pull requests are all welcome.

## Reporting a bug

Open an issue with:

- what you did, what you expected, and what happened;
- the kind of page involved (framework, bundler, iframes, SRI…) — a public URL or a minimal page that reproduces it is ideal;
- your OS and the output of **View › Editor DevTools** (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Alt</kbd> + <kbd>I</kbd>) or **Page DevTools** if something failed there.

Please don't paste private URLs, cookies or tokens into issues.

## Setting up

```bash
git clone https://github.com/olehwebdev/console-editor.git
cd console-editor
npm install
npm run dev            # the app, with hot reload
npm run demo-site      # in another terminal: pages to try it on (port 5174)
```

Node.js 22.18 or newer is required. Runs from source keep their data in a `Console Editor (dev)` folder, apart from an installed copy's, so both can run at once. On Linux as root (containers), start Electron without its sandbox: `npm run dev -- --noSandbox`.

## Before opening a pull request

```bash
npm run typecheck
npm run lint:fsd
npm test               # unit, renderer, and engine tests in real Chromium (npx playwright install chromium)
npm run test:e2e       # the built app end to end (headless Linux: xvfb-run npm run test:e2e)
```

If you change packaging (`electron-builder.ts`, `build/`, anything the installed app loads), also build and drive the packaged app: `npm run dist -- --dir && npm run test:packaged` (headless Linux: `xvfb-run npm run test:packaged`). If you change updating, build a newer copy to update to (`npx electron-builder --publish never -c.directories.output=dist-next -c.extraMetadata.version=99.0.0`) and run `npm run test:update -- <installed app or AppImage> dist-next`.

A good pull request:

- **fixes one thing** and explains why, with a test that fails without the change (behaviour of Chromium or CDP is best pinned in `test/integration`);
- **follows the architecture**: the renderer uses [Feature-Sliced Design](https://feature-sliced.design) (`app → pages → widgets → features → entities → shared`, checked by `npm run lint:fsd`); UI uses the tokens and components in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md);
- **matches the surrounding code**: naming, comment density (short comments that explain *why*), and no unrelated refactors;
- **updates the docs** when behaviour changes: [docs/SPEC.md](docs/SPEC.md) describes how the app works, including Chromium facts verified in tests;
- **notes user-visible changes** under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md), written for people using the app: they read it as **What's New** after updating.

## Releasing

1. In [CHANGELOG.md](CHANGELOG.md), move the `[Unreleased]` notes under a dated heading for the new version (`## [0.2.0] - 2026-10-01`) and update the links at the bottom. The release's notes start with this section and the app shows it as **What's New**; the workflow refuses a version without one.
2. Set the new version in `package.json` (`npm version 0.2.0 --no-git-tag-version`) and commit both on `main`.
3. Push a matching tag (`git tag v0.2.0 && git push origin v0.2.0`), or run the **Release** workflow by hand with **Draft release** ticked. Either way it refuses a version that already has a release or draft.
4. The workflow runs the checks, builds the installers on macOS, Windows and Linux, installs and smoke-tests them, updates an installed Windows app and an AppImage to a newer build, and drafts the release with the installers, the updater's `latest*.yml` and block maps, and `SHA256SUMS.txt`.
5. Review the draft on GitHub and publish it. Installed copies find it at their next start, or within six hours.

## Licence

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
