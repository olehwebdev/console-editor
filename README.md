# Console Editor

Edit the JavaScript, CSS and HTML of **any live website** in a real code editor, and see the result on the page right away. No build, no server access, no proxy certificates.

Made for the moment when a service is too big to build locally but you need to debug or try a fix against the deployed site, and pasting code into the DevTools console is the only other option.

![Console Editor: a minified bundle pretty-printed and patched, with the live page on the right](docs/screenshot.png)

## How it works

The app embeds Chromium. When the page requests a file you've edited, the app answers with your version instead of the server's, using the Chrome DevTools Protocol `Fetch` domain (the mechanism behind DevTools "Local Overrides"). Only the app's browser sees your changes; the server is untouched.

- **Pick files from the page.** Scripts, stylesheets and documents are listed as the page loads them.
- **Real editor.** Monaco (VS Code's editor) with syntax highlighting, find/replace, multi-cursor and a diff view.
- **Minified bundles are pretty-printed** when opened.
- **Ctrl/Cmd+S** saves the override and reloads the page.
- **Survives deploys.** Match hashed names such as `main.*.js` with one click, and get a warning when the live file changed.
- **Handles the things that normally break this:** compressed responses, Subresource Integrity (static and runtime-set), HTTP cache, service workers and stale source maps.
- **Overrides persist** and can be switched on and off individually.

Is this a good idea, and how does it compare to DevTools overrides, proxies and extensions? See **[docs/RESEARCH.md](docs/RESEARCH.md)**. For the design and roadmap, see **[docs/SPEC.md](docs/SPEC.md)**.

## Quick start

```bash
npm install
npm run dev              # start the app with hot reload
```

Type a URL in the address bar (`https://…` or `localhost:3000`). Then pick a file under **Page resources**, edit it, and press **Ctrl/Cmd+S**.

To try it on a site built to be awkward (gzip, SRI, hashed bundle names), run `npm run demo-site` in a second terminal and open `http://127.0.0.1:5174`.

To open a URL on start: `CONSOLE_EDITOR_URL=https://example.com npm run dev`.

### Shortcuts

| Keys | Action |
|---|---|
| Ctrl/Cmd+S | Save override (and reload the page) |
| Shift+Alt+F | Pretty-print |
| Ctrl/Cmd+Shift+D | Toggle diff against the text you started from |
| Ctrl/Cmd+R | Reload the page |
| Ctrl/Cmd+L | Focus the address bar |
| Ctrl/Cmd+Shift+J | DevTools for the page |

## Development

| Command | What it does |
|---|---|
| `npm run dev` | Run the app with hot reload (electron-vite) |
| `npm run build` / `npm start` | Production build / run the build |
| `npm run typecheck` | TypeScript, main and renderer |
| `npm test` | Unit tests, plus integration tests of the interception engine in real Chromium (skipped if Chromium is missing: `npx playwright install chromium`) |
| `npm run test:e2e` | Builds and drives the Electron app end to end (headless Linux: `xvfb-run npm run test:e2e`) |
| `npm run demo-site` | Serves the fixture site on port 5174 |

Layout: `src/main` (Electron main process and the interception engine), `src/preload` (IPC bridge), `src/renderer` (editor UI), `src/shared` (types and URL matching), `test/` (unit, integration, e2e and the fixture site). [SPEC.md §4](docs/SPEC.md#4-source-layout) has more detail.

When running as root on Linux (containers, CI), Electron needs its sandbox off: `npm run dev -- --noSandbox`.

## Limitations

- You edit the **built output** (bundled JS), not the original TypeScript/JSX. It's readable after pretty-printing, but identifiers stay minified.
- Changes exist only in the app's browser. The real fix still goes through your normal build and deploy.
- Workers and cross-origin iframes aren't intercepted yet (roadmap M2).
- You log in to sites once inside the app; sessions are kept between runs.
