# Contributing to Console Editor

Thanks for helping! Bug reports, ideas and pull requests are all welcome. Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting a bug

[Open an issue](https://github.com/olehwebdev/console-editor/issues/new/choose) with the **Bug report** form. It asks for:

- what you did, what you expected, and what happened;
- the kind of page involved (framework, bundler, iframes, SRI…) — a public URL or a minimal page that reproduces it is ideal;
- the app's version, how you installed it, your OS, and the output of **View › Editor DevTools** (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Alt</kbd> + <kbd>I</kbd>) or **Page DevTools** if something failed there.

Please don't paste private URLs, cookies or tokens into issues. Ideas go in the **Feature request** form, and a security problem goes through the [security policy](SECURITY.md), privately, never in an issue.

## Setting up

```bash
git clone https://github.com/olehwebdev/console-editor.git
cd console-editor
npm install
npm run dev            # the app, with hot reload
npm run demo-site      # in another terminal: pages to try it on (port 5174)
```

`npm install` also sets up git hooks (`lefthook.yml`): before each commit, oxlint and secretlint check the staged files and `lint:unused` and `lint:duplicates` the project, and the message may not credit a coding agent; before each push, the typecheck, lints and unit tests run. CI runs the same checks again, but for the commit message's. With Claude Code, `.claude/settings.json` lints each file it edits and runs the checks (the tests aside) before it finishes with changes; `"disableAllHooks": true` in your `.claude/settings.local.json` turns that off for you. Node.js 22.18 or newer is required. Runs from source keep their data in a `Console Editor (dev)` folder, apart from an installed copy's, so both can run at once. On Linux as root (containers), start Electron without its sandbox: `npm run dev -- --noSandbox`.

## Before opening a pull request

```bash
npm run typecheck
npm run lint:fsd
npm run lint:structure # files of at most 150 lines, one function each, no switch (CLAUDE.md › Code structure)
npm run lint           # oxlint with type information: React's rules and misused promises (.oxlintrc.json)
npm run lint:unused    # no unused files, dependencies or exports (knip; types in a slice's index.ts are its public API)
npm run lint:duplicates # no new copies of code (jscpd; .jscpd-baseline.json lists the older ones, and only shrinks)
npm run lint:secrets   # no keys, tokens or private keys (secretlint, .secretlintrc.json)
npm test               # unit, renderer, and engine tests in real Chromium (npx playwright install chromium)
npm run test:e2e       # the built app end to end (headless Linux: xvfb-run npm run test:e2e)
npm run test:perf      # the inspector and its UI on large apps, against budgets (headless Linux: xvfb-run -a); not in CI
```

If you change packaging (`electron-builder.ts`, `build/`, anything the installed app loads), also build and drive the packaged app: `npm run dist -- --dir && npm run test:packaged` (headless Linux: `xvfb-run npm run test:packaged`). If you change updating, build a newer copy to update to (`npx electron-builder --publish never -c.directories.output=dist-next -c.extraMetadata.version=99.0.0`) and run `npm run test:update -- <installed app or AppImage> dist-next`.

A good pull request (its template lists the same checks):

- **comes from a git flow branch** (`feature/…`, `bugfix/…`; see [CLAUDE.md › Branches](CLAUDE.md#branches-git-flow)) into `main`;
- **fixes one thing** and explains why, with a test that fails without the change (behaviour of Chromium or CDP is best pinned in `test/integration`);
- **follows the architecture**: the renderer uses [Feature-Sliced Design](https://feature-sliced.design) (`app → pages → widgets → features → entities → shared`, checked by `npm run lint:fsd`); UI uses the tokens and components in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md);
- **matches the surrounding code**: naming, comment density (short comments that explain *why*), thin files split by concern ([CLAUDE.md › Code structure](CLAUDE.md#code-structure), checked by `npm run lint:structure`), and no unrelated refactors;
- **updates the docs** when behaviour changes: [docs/SPEC.md](docs/SPEC.md) describes how the app works, including Chromium facts verified in tests;
- **notes user-visible changes** under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md), written for people using the app: they read it as **What's New** after updating.

## Releasing

`main` takes changes only through pull requests ([rulesets](.github/rulesets/README.md)), so a release is one too. What gets released is the release branch's version commit, built and tested before anything is tagged:

1. Start a `release/0.3.0` branch from `main`. In [CHANGELOG.md](CHANGELOG.md), move the `[Unreleased]` notes under a dated heading for the new version (`## [0.3.0] - 2026-10-01`) and update the links at the bottom. The release's notes start with this section and the app shows it as **What's New**; the workflow refuses a version without one.
2. Set the new version in `package.json` (`npm version 0.3.0 --no-git-tag-version`) and commit both: this is the version commit. Open a pull request into `main`.
3. Once CI passes, run the **Release** workflow by hand on `release/0.3.0` with **Draft release** ticked. It drafts the release on the branch's last commit, the version commit, and tags nothing yet. It refuses a version that already has a release or draft. If it fails, or you commit more to the branch (step 5's update doesn't count), delete any draft and run it again.
4. The workflow runs the checks, builds the installers on macOS, Windows and Linux, installs and smoke-tests them, updates an installed Windows app and an AppImage to a newer build, and drafts the release with the installers, the updater's `latest*.yml` and block maps, and `SHA256SUMS.txt`.
5. Merge the pull request with a **merge commit** (not squash or rebase), so the drafted commit stays in `main`'s history. If `main` moved meanwhile, GitHub asks you to update the branch first: use **Update branch**, not **Update with rebase**, and don't draft again, since the branch's last commit then carries `main`'s unreleased work.
6. Check that `git ls-remote --tags origin v0.3.0` prints nothing, then review the draft on GitHub and publish it. Publishing creates the `v0.3.0` tag on the drafted commit; tags can't be moved or deleted, so don't push `v*` tags by hand. Installed copies find the release at their next start, or within six hours.

A patch release while `main` holds unreleased work goes the same way from a `hotfix/0.2.1` branch started from the latest release tag ([CLAUDE.md › Branches](CLAUDE.md#branches-git-flow)). Its pull request always needs step 5's update.

## Licence

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
