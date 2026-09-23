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
  startFixtureSite(port).then((site) => console.log(`Fixture site running at ${site.url}`));
}
