/**
 * A tiny website that reproduces the things that make patching production
 * sites hard: gzip, Subresource Integrity, cache-busted file names, source maps,
 * minified code and a missing file.
 *
 * Used by the integration/e2e tests, and runnable on its own for manual testing:
 *   npm run demo-site        (serves it on http://127.0.0.1:5174)
 */
import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { STORE_BUNDLE, STORE_BUNDLE_PATH, STORE_CSS, STORE_CSS_PATH, STORE_HTML, STORE_ICON, STORE_ICON_PATH } from './demoStore.ts';
import { headersRoutes } from './headersPages.ts';
import {
  BOTH_JS,
  BOTH_JS_MAP,
  HTML_JS,
  INLINE_JS_CODE,
  INLINE_JS_MAP,
  LEGACY_JS,
  LEGACY_JS_MAP,
  MAIN_JS,
  MAIN_JS_MAP,
  MAPS_HTML,
  MAPS_PATH,
  MISSING_JS,
  STYLE_CSS,
  THEME_CSS,
  THEME_CSS_MAP,
  XSSI_JS,
  XSSI_JS_MAP,
} from './sourceMaps.ts';

export { MAIN_JS, STYLE_CSS };

export const APP_JS = `window.appValue = 'original';\ndocument.addEventListener('DOMContentLoaded', () => { document.querySelector('#app').textContent = 'app: ' + window.appValue; });\n`;

export const MAIN_JS_PATH = '/static/js/main.3f9a1c2b.js';

/** Loaded at runtime by a script that sets `integrity` from JS (like webpack's SRI plugin). */
export const LAZY_JS = `window.lazyValue = 'original-lazy';\n`;

function sri(content: string): string {
  return `sha384-${createHash('sha384').update(content).digest('base64')}`;
}

export function indexHtml(): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fixture site</title>
  <link rel="stylesheet" href="/style.css">
  <script src="/app.js" integrity="${sri(APP_JS)}" crossorigin="anonymous"></script>
  <script src="${MAIN_JS_PATH}" defer></script>
  <script>
    (function () {
      var s = document.createElement('script');
      s.src = '/lazy.js';
      s.integrity = '${sri(LAZY_JS)}';
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    })();
  </script>
</head>
<body>
  <h1>Fixture site</h1>
  <div id="app">app: loading</div>
  <div id="main"></div>
  <ul id="list"></ul>
</body>
</html>
`;
}

// --- iframe fixtures -------------------------------------------------------
// Site = scheme + registrable domain, so ports don't make sites different. The
// top page is on 127.0.0.1, the widget on `localhost` (cross-site, so it gets
// its own process and CDP target) and the widget's own iframe on
// `nested.localhost` (cross-site again). Chromium resolves *.localhost to
// loopback itself, so no DNS or hosts-file setup is needed.

export const SAME_FRAME_JS = `window.sameValue = 'original-same';\n`;
export const WIDGET_JS = `window.widgetValue = 'original-widget';\ndocument.addEventListener('DOMContentLoaded', () => { document.querySelector('#widget').textContent = 'widget: ' + window.widgetValue; });\n`;
export const WIDGET_CSS = `body { color: rgb(0, 0, 0); font-family: sans-serif; }\n`;
export const WIDGET_LAZY_JS = `window.widgetLazyValue = 'original-widget-lazy';\n`;
export const NESTED_JS = `window.nestedValue = 'original-nested';\n`;
export const WIDGET2_JS = `window.widget2Value = 'original-widget2';\n`;
/** Loaded by the top page and by the cross-site widget (one URL, two frames). */
export const SHARED_JS = `window.sharedValue = 'original-shared';\n`;
export const BACK_JS = `window.backValue = 'original-back';\n`;

export function framesHtml(port: number): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Frames fixture</title></head>
<body>
  <script src="http://127.0.0.1:${port}/frames/shared.js"></script>
  <h1>Frames fixture</h1>
  <iframe id="same" src="/frames/same.html" width="300" height="80"></iframe>
  <iframe id="widget" src="http://localhost:${port}/frames/widget.html" width="400" height="200"></iframe>
</body>
</html>
`;
}

export function widgetHtml(port: number): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Widget</title>
  <link rel="stylesheet" href="/frames/widget.css">
  <script src="/frames/widget.js" integrity="${sri(WIDGET_JS)}" crossorigin="anonymous"></script>
  <script>
    (function () {
      var s = document.createElement('script');
      s.src = '/frames/widget-lazy.js';
      s.integrity = '${sri(WIDGET_LAZY_JS)}';
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    })();
  </script>
</head>
<body>
  <script src="http://127.0.0.1:${port}/frames/shared.js"></script>
  <div id="widget">widget: loading</div>
  <iframe id="nested" src="http://nested.localhost:${port}/frames/nested.html" width="200" height="60"></iframe>
</body>
</html>
`;
}

/** What the fixture server answers for one path. */
export interface FixtureRoute {
  type: string;
  body: string;
  /** Changes the default headers: a string sets or replaces one, null drops it. Applied before gzip and Content-Length. */
  headers?: Record<string, string | null>;
  /** 200 unless given (a 302 needs a Location in `headers`). */
  status?: number;
  /** Answers a CORS preflight (OPTIONS) with 405 and no CORS headers, as many APIs do. */
  rejectPreflight?: boolean;
}

// --- console fixtures --------------------------------------------------------
// A shell page embedding services the way a micro-frontend app does: a same-site
// nav, and cart and billing on sites of their own (so each is a separate
// process and CDP session). Each logs as it starts; the shell relays cart's
// messages to billing, which logs what it gets.

export function servicesHtml(port: number): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Services</title></head>
<body>
  <script>
    console.log('shell ready');
    addEventListener('message', (e) => document.getElementById('billing').contentWindow.postMessage(e.data, '*'));
  </script>
  <iframe id="nav" name="nav" src="/services/nav.html" width="300" height="60"></iframe>
  <iframe id="cart" name="cart" src="http://cart.localhost:${port}/services/cart.html" width="300" height="60"></iframe>
  <iframe id="billing" name="billing" src="http://billing.localhost:${port}/services/billing.html" width="300" height="60"></iframe>
</body>
</html>
`;
}

export const NAV_HTML = `<!doctype html><script>console.log('nav ready');</script><p>nav</p>`;
export const CART_HTML = `<!doctype html><script>console.log('cart ready'); window.addItem = (sku) => parent.postMessage({ type: 'add', sku }, '*');</script><p>cart</p>`;
export const BILLING_HTML = `<!doctype html><script>
  console.log('billing ready');
  addEventListener('message', (e) => console.log('billing got', JSON.stringify(e.data)));
</script><p>billing</p>`;

// --- worker fixtures -------------------------------------------------------
// /workers/ starts every kind of worker. Each reports a value from a script it
// loaded; the page collects them in `window.workerResults` and #results. The
// libraries say 'original', so a test can tell when its override ran.

export const WORKER_LIB_JS = `self.libValue = 'original-lib';\n`;
export const NESTED_WORKER_JS = `importScripts('/workers/nested-lib.js');\npostMessage('original-nested:' + self.nestedLibValue);\n`;
export const NESTED_LIB_JS = `self.nestedLibValue = 'original-nested-lib';\n`;
export const MODULE_DEP_JS = `export const depValue = 'original-dep';\n`;
export const SHARED_LIB_JS = `self.sharedLibValue = 'original-shared-lib';\n`;
export const SW_JS = `importScripts('/workers/sw-lib.js');
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('message', (event) => event.source.postMessage({ sw: 'original-sw:' + self.swLibValue }));
`;
export const SW_LIB_JS = `self.swLibValue = 'original-sw-lib';\n`;
export const WORKLET_JS = `registerProcessor('original-processor', class extends AudioWorkletProcessor { process() { return false; } });\n`;

const WORKERS_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Workers fixture</title></head>
<body>
  <h1>Workers fixture</h1>
  <pre id="results">{}</pre>
  <script>
    window.workerResults = {};
    function report(key, value) {
      workerResults[key] = value;
      document.querySelector('#results').textContent = JSON.stringify(workerResults, null, 1);
    }
    const worker = new Worker('/workers/worker.js');
    worker.onmessage = (e) => report(e.data.key, e.data.value);
    const moduleWorker = new Worker('/workers/module.js', { type: 'module' });
    moduleWorker.onmessage = (e) => report('module', e.data);
    const shared = new SharedWorker('/workers/shared.js');
    shared.port.onmessage = (e) => report('shared', e.data);
    shared.port.start();
    navigator.serviceWorker.addEventListener('message', (e) => report('sw', e.data.sw));
    navigator.serviceWorker
      .register('/workers/sw.js', { scope: '/workers/' })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.active.postMessage('ping'))
      .catch((err) => report('sw', 'error: ' + err.message));
    const audio = new AudioContext();
    audio.audioWorklet
      .addModule('/workers/worklet.js')
      .then(() => {
        for (const name of ['original', 'patched']) {
          try {
            new AudioWorkletNode(audio, name + '-processor');
            report('worklet', name);
          } catch {}
        }
      })
      .catch((err) => report('worklet', 'error: ' + err.message));
  </script>
</body>
</html>
`;

// /workers-frame/ embeds a cross-site iframe (localhost) that starts /workers/'s
// dedicated worker, which imports a script and starts a nested worker. The
// iframe passes what they report up to the page's `window.workerResults`.

export function workersFrameHtml(port: number): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Workers in an iframe</title></head>
<body>
  <h1>Workers in a cross-site iframe</h1>
  <script>
    window.workerResults = {};
    addEventListener('message', (e) => (workerResults[e.data.key] = e.data.value));
  </script>
  <iframe id="frame" src="http://localhost:${port}/workers-frame/frame.html" width="300" height="80"></iframe>
</body>
</html>
`;
}

const WORKERS_FRAME_HTML = `<!doctype html>
<script>
  const worker = new Worker('/workers/worker.js');
  worker.onmessage = (e) => parent.postMessage(e.data, '*');
</script>
<p>cross-site frame with a worker</p>
`;

export interface FixtureSite {
  url: string;
  server: Server;
  /** Replaces the body served for a path (simulates a new deploy). */
  setBody(path: string, body: string): void;
  /** How many requests reached the server for a path (query ignored) with a method. */
  hits(path: string, method?: string): number;
  close(): Promise<void>;
}

const JSON_TYPE = 'application/json';

export async function startFixtureSite(port = 0): Promise<FixtureSite> {
  const bodies = new Map<string, FixtureRoute>([
    ['/', { type: 'text/html; charset=utf-8', body: indexHtml() }],
    ['/app.js', { type: 'application/javascript', body: APP_JS }],
    ['/style.css', { type: 'text/css', body: STYLE_CSS }],
    [MAIN_JS_PATH, { type: 'application/javascript; charset=utf-8', body: MAIN_JS, headers: { SourceMap: 'main.3f9a1c2b.js.map' } }],
    [`${MAIN_JS_PATH}.map`, { type: JSON_TYPE, body: MAIN_JS_MAP }],
    ['/lazy.js', { type: 'text/javascript', body: LAZY_JS }],
  ]);

  const requests: Array<{ method: string; path: string }> = [];
  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    requests.push({ method: req.method ?? 'GET', path });
    const entry = bodies.get(path);
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    if (entry.rejectPreflight && req.method === 'OPTIONS') {
      res.writeHead(405, { 'Content-Type': 'text/plain', 'Content-Length': '0' });
      res.end();
      return;
    }
    const headers: Record<string, string> = {
      'Content-Type': entry.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    };
    for (const [name, value] of Object.entries(entry.headers ?? {})) {
      for (const other of Object.keys(headers)) if (other.toLowerCase() === name.toLowerCase()) delete headers[other];
      if (value !== null) headers[name] = value;
    }
    let payload: Buffer = Buffer.from(entry.body, 'utf8');
    if (/\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
      payload = gzipSync(payload);
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = String(payload.length);
    res.writeHead(entry.status ?? 200, headers);
    res.end(payload);
  });

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  const { port: actualPort } = server.address() as AddressInfo;
  const add = (path: string, type: string, body: string, headers?: Record<string, string>) => bodies.set(path, { type, body, headers });
  add('/frames.html', 'text/html; charset=utf-8', framesHtml(actualPort));
  add('/frames/same.html', 'text/html; charset=utf-8', '<!doctype html><script src="/frames/same.js"></script><p>same-site frame</p>');
  add('/frames/same.js', 'text/javascript', SAME_FRAME_JS);
  add('/frames/widget.html', 'text/html; charset=utf-8', widgetHtml(actualPort));
  add('/frames/widget.js', 'text/javascript', WIDGET_JS);
  add('/frames/widget.css', 'text/css', WIDGET_CSS);
  add('/frames/widget-lazy.js', 'text/javascript', WIDGET_LAZY_JS);
  add('/frames/widget2.html', 'text/html; charset=utf-8', '<!doctype html><script src="/frames/widget2.js"></script><p>widget page 2</p>');
  add('/frames/widget2.js', 'text/javascript', WIDGET2_JS);
  add('/frames/nested.html', 'text/html; charset=utf-8', '<!doctype html><script src="/frames/nested.js"></script><p>nested frame</p>');
  add('/frames/nested.js', 'text/javascript', NESTED_JS);
  add('/frames/shared.js', 'text/javascript', SHARED_JS);
  add('/frames/back.html', 'text/html; charset=utf-8', '<!doctype html><script src="/frames/back.js"></script><p>back on the top page\'s site</p>');
  add('/frames/back.js', 'text/javascript', BACK_JS);
  add('/services.html', 'text/html; charset=utf-8', servicesHtml(actualPort));
  add('/services/nav.html', 'text/html; charset=utf-8', NAV_HTML);
  add('/services/cart.html', 'text/html; charset=utf-8', CART_HTML);
  add('/services/billing.html', 'text/html; charset=utf-8', BILLING_HTML);
  add('/workers/', 'text/html; charset=utf-8', WORKERS_HTML);
  add(
    '/workers/worker.js',
    'text/javascript',
    `importScripts('/workers/lib.js');\npostMessage({ key: 'worker', value: self.libValue });\nconst nested = new Worker('/workers/nested.js');\nnested.onmessage = (e) => postMessage({ key: 'nested', value: e.data });\n`,
  );
  add('/workers/lib.js', 'text/javascript', WORKER_LIB_JS);
  add('/workers/nested.js', 'text/javascript', NESTED_WORKER_JS);
  add('/workers/nested-lib.js', 'text/javascript', NESTED_LIB_JS);
  add('/workers/module.js', 'text/javascript', `import { depValue } from '/workers/dep.js';\npostMessage(depValue);\n`);
  add('/workers/dep.js', 'text/javascript', MODULE_DEP_JS);
  add('/workers/shared.js', 'text/javascript', `importScripts('/workers/shared-lib.js');\nonconnect = (e) => e.ports[0].postMessage(self.sharedLibValue);\n`);
  add('/workers/shared-lib.js', 'text/javascript', SHARED_LIB_JS);
  add('/workers/sw.js', 'text/javascript', SW_JS);
  add('/workers/sw-lib.js', 'text/javascript', SW_LIB_JS);
  add('/workers/worklet.js', 'text/javascript', WORKLET_JS);
  add('/workers-frame/', 'text/html; charset=utf-8', workersFrameHtml(actualPort));
  add('/workers-frame/frame.html', 'text/html; charset=utf-8', WORKERS_FRAME_HTML);
  // The demo store (README screenshots, `npm run demo-site`): a checkout with a bug in its bundle.
  add('/store/', 'text/html; charset=utf-8', STORE_HTML);
  add(STORE_BUNDLE_PATH, 'application/javascript; charset=utf-8', STORE_BUNDLE);
  add(STORE_CSS_PATH, 'text/css', STORE_CSS);
  add(STORE_ICON_PATH, 'image/svg+xml', STORE_ICON);
  // Source maps named every way there is (the main bundle's is served with it, above).
  add(MAPS_PATH.page, 'text/html; charset=utf-8', MAPS_HTML);
  add(MAPS_PATH.both, 'text/javascript', BOTH_JS, { SourceMap: 'both.js.map' });
  add('/maps/both.js.map', JSON_TYPE, BOTH_JS_MAP);
  add(MAPS_PATH.legacy, 'text/javascript', LEGACY_JS, { 'X-SourceMap': 'legacy.js.map' });
  add('/maps/legacy.js.map', JSON_TYPE, LEGACY_JS_MAP);
  add(MAPS_PATH.inline, 'text/javascript', `${INLINE_JS_CODE}//# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(INLINE_JS_MAP).toString('base64')}\n`);
  add(MAPS_PATH.theme, 'text/css', THEME_CSS, { SourceMap: 'wrong.css.map' });
  add('/maps/theme.css.map', JSON_TYPE, THEME_CSS_MAP);
  add(MAPS_PATH.missing, 'text/javascript', MISSING_JS);
  add(MAPS_PATH.html, 'text/javascript', HTML_JS);
  add('/maps/html.js.map', 'text/html; charset=utf-8', '<!doctype html><title>App</title><div id="root"></div>');
  add(MAPS_PATH.xssi, 'text/javascript', XSSI_JS);
  add('/maps/xssi.js.map', JSON_TYPE, `)]}'\n${XSSI_JS_MAP}`);
  // A page with an unsaved-changes guard, a new-tab link and a pop-up (site view policy).
  add(
    '/guard.html',
    'text/html; charset=utf-8',
    `<!doctype html><title>Guarded</title>
<script>
  window.loadedAt = Math.random();
  addEventListener('beforeunload', (e) => { e.preventDefault(); e.returnValue = ''; });
</script>
<p><a id="tab" href="/?from=tab" target="_blank">new tab</a></p>`,
  );
  // Blocking, header and CORS rules (test/integration/rules.chromium.test.ts, test/e2e): all under /headers/.
  for (const [path, route] of headersRoutes(actualPort)) bodies.set(path, route);
  return {
    url: `http://127.0.0.1:${actualPort}`,
    server,
    setBody(path, body) {
      const entry = bodies.get(path);
      if (entry) entry.body = body;
    },
    hits: (path, method = 'GET') => requests.filter((r) => r.path === path && r.method === method).length,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

if (process.argv[1]?.endsWith('site.ts')) {
  const port = Number(process.env.PORT ?? 5174);
  void startFixtureSite(port).then((site) =>
    console.log(`Demo site running:\n  ${site.url}/store/      a shop checkout with a bug to fix\n  ${site.url}/            files built to be awkward (gzip, SRI, hashed names)\n  ${site.url}/frames.html cross-site and nested iframes\n  ${site.url}/services.html services in iframes that log and message each other\n  ${site.url}/workers/    dedicated, shared and service workers, and a worklet\n  ${site.url}/maps.html   source maps named every way there is`),
  );
}
