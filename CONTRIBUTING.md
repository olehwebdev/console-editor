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

Node.js 22.18 or newer is required. On Linux as root (containers), start Electron without its sandbox: `npm run dev -- --noSandbox`.

## Before opening a pull request

```bash
npm run typecheck
npm run lint:fsd
npm test               # unit, renderer, and engine tests in real Chromium (npx playwright install chromium)
npm run test:e2e       # the built app end to end (headless Linux: xvfb-run npm run test:e2e)
```

A good pull request:

- **fixes one thing** and explains why, with a test that fails without the change (behaviour of Chromium or CDP is best pinned in `test/integration`);
- **follows the architecture**: the renderer uses [Feature-Sliced Design](https://feature-sliced.design) (`app → pages → widgets → features → entities → shared`, checked by `npm run lint:fsd`); UI uses the tokens and components in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md);
- **matches the surrounding code**: naming, comment density (short comments that explain *why*), and no unrelated refactors;
- **updates the docs** when behaviour changes: [docs/SPEC.md](docs/SPEC.md) describes how the app works, including Chromium facts verified in tests.

## Licence

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
