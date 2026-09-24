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

export const APP_JS = `window.appValue = 'original';\ndocument.addEventListener('DOMContentLoaded', () => { document.querySelector('#app').textContent = 'app: ' + window.appValue; });\n`;

/** A realistic minified bundle (one long line plus a source map comment). */
export const MAIN_JS =
  `(()=>{"use strict";var e={version:"1.0.0",greet:function(n){return"Hello, "+n},sum:function(n){return n.reduce(function(t,r){return t+r},0)},` +
  `clamp:function(n,t,r){return Math.min(Math.max(n,t),r)},debounce:function(n,t){var r;return function(){var o=this,u=arguments;clearTimeout(r),r=setTimeout(function(){n.apply(o,u)},t)}},` +
  `format:function(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n)}};function t(n){var t=document.createElement("li");return t.textContent=n,t}` +
  `function r(n,r){var o=document.querySelector(n);o&&r.forEach(function(n){o.appendChild(t(n))})}var o=[{id:1,name:"Alpha",price:12.5},{id:2,name:"Beta",price:7.25},` +
  `{id:3,name:"Gamma",price:30}],u={items:o,total:e.sum(o.map(function(n){return n.price})),selected:null};function i(n){u.selected=o.find(function(t){return t.id===n})||null,` +
  `c()}function c(){var n=document.querySelector("#main");n&&(n.textContent=e.greet("world")+" \u00b7 "+o.length+" items \u00b7 total "+e.format(u.total)+(u.selected?" \u00b7 selected "+u.selected.name:""))}` +
  `window.mainValue="original-main",window.lib=e,window.store=u,window.select=i,document.addEventListener("DOMContentLoaded",function(){c(),r("#list",o.map(function(n){return n.name}))})})();\n` +
  `//# sourceMappingURL=main.3f9a1c2b.js.map\n`;

export const STYLE_CSS = `body{font-family:sans-serif;color:rgb(0, 0, 0)}#app{padding:8px;border:1px solid #ccc}\n`;

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

export interface FixtureSite {
  url: string;
  server: Server;
  /** Replaces the body served for a path (simulates a new deploy). */
  setBody(path: string, body: string): void;
  close(): Promise<void>;
}

export async function startFixtureSite(port = 0): Promise<FixtureSite> {
  const bodies = new Map<string, { type: string; body: string }>([
    ['/', { type: 'text/html; charset=utf-8', body: indexHtml() }],
    ['/app.js', { type: 'application/javascript', body: APP_JS }],
    ['/style.css', { type: 'text/css', body: STYLE_CSS }],
    [MAIN_JS_PATH, { type: 'application/javascript; charset=utf-8', body: MAIN_JS }],
    ['/lazy.js', { type: 'text/javascript', body: LAZY_JS }],
  ]);

  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    const entry = bodies.get(path);
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    const headers: Record<string, string> = {
      'Content-Type': entry.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    };
    if (path === MAIN_JS_PATH) headers.SourceMap = 'main.3f9a1c2b.js.map';
    let payload: Buffer = Buffer.from(entry.body, 'utf8');
    if (/\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
      payload = gzipSync(payload);
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = String(payload.length);
    res.writeHead(200, headers);
    res.end(payload);
  });

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  const { port: actualPort } = server.address() as AddressInfo;
  const add = (path: string, type: string, body: string) => bodies.set(path, { type, body });
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
  // The demo store (README screenshots, `npm run demo-site`): a checkout with a bug in its bundle.
  add('/store/', 'text/html; charset=utf-8', STORE_HTML);
  add(STORE_BUNDLE_PATH, 'application/javascript; charset=utf-8', STORE_BUNDLE);
  add(STORE_CSS_PATH, 'text/css', STORE_CSS);
  add(STORE_ICON_PATH, 'image/svg+xml', STORE_ICON);
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
  return {
    url: `http://127.0.0.1:${actualPort}`,
    server,
    setBody(path, body) {
      const entry = bodies.get(path);
      if (entry) entry.body = body;
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

if (process.argv[1] && /site\.ts$/.test(process.argv[1])) {
  const port = Number(process.env.PORT ?? 5174);
  startFixtureSite(port).then((site) =>
    console.log(`Demo site running:\n  ${site.url}/store/      a shop checkout with a bug to fix\n  ${site.url}/            files built to be awkward (gzip, SRI, hashed names)\n  ${site.url}/frames.html cross-site and nested iframes`),
  );
}
